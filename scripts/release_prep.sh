#!/bin/bash

set -x

# pre-requisites: install github CLI
# - github documentation: https://github.com/cli/cli#installation
# - github is remote 'origin'
# - PRs should use a test section by convention starting with "## Test" (captures "Tests" "Testing")
# - PRs should use a deploy notes section by convention starting with "## Deploy Notes"
# - ALL build and release PRs start with "build: "
#
# To run, from root of project:
# bash scripts/release_prep.sh

has_local_changes=$(git status --porcelain --untracked-files=no --ignored=no)
if [[ ${has_local_changes} ]]; then
  set +x
  echo ==========
  echo "ABORT: You have local modifications. Please stash or commit changes and run again."
  echo ==========
  exit 1
fi

git fetch --all --tags
git reset --hard
git pull
git checkout develop
git reset --hard origin/develop

short_hash=$(git rev-parse --short HEAD)
current_version=v$(node -p "require('./package.json').version")
temp_release_branch=temp_${short_hash}

git checkout -b ${temp_release_branch}

release_version=$(npm --no-git-tag-version version minor | grep -E '^v\d')
release_branch=release_${release_version}
may_force_push=

if [[ "$1" == "--recut" ]]; then
  git tag -d ${release_version}
  git push --delete origin ${release_version}
  git branch -D ${release_branch}
  may_force_push=-f
fi

git commit -a -n -m "chore: bump version to ${release_version}"
git tag ${release_version}
git checkout -b ${release_branch}
git branch -D ${temp_release_branch}

git push origin ${may_force_push} HEAD:${release_branch}
git push -f origin HEAD:staging
git push origin ${release_version}

# extract changelog to inject into the PR
pr_body_file=.pr_body_${release_version}
pr_body_file_grouped=.pr_body_${release_version}_grouped

awk "/^#### \[${release_version}\]/{flag=1;next}/####/{flag=0}flag" CHANGELOG.md | sed -E '/^([^-]|[[:space:]]*$)/d' > ${pr_body_file}

# Show new items
echo "## New" > ${pr_body_file_grouped}
echo "" >> ${pr_body_file_grouped}
grep -v -E -- '- [a-z]+\(deps(-dev)?\)' ${pr_body_file} >> ${pr_body_file_grouped}

# Show dependency upgrades
deps=$(grep -E -- '- [a-z]+\(deps\)' ${pr_body_file})
if [[ ${deps} =~ [^[:space:]] ]]; then
  echo "" >> ${pr_body_file_grouped}
  echo "## Dependencies" >> ${pr_body_file_grouped}
  echo "" >> ${pr_body_file_grouped}
  echo "${deps}" >> ${pr_body_file_grouped}
fi

# Show dev-dependency upgrades
devdeps=$(grep -E -- '- [a-z]+\(deps-dev\)' ${pr_body_file})
if [[ ${devdeps} =~ [^[:space:]] ]]; then
  echo "" >> ${pr_body_file_grouped}
  echo "## Dev-Dependencies" >> ${pr_body_file_grouped}
  echo "" >> ${pr_body_file_grouped}
  echo "${devdeps}" >> ${pr_body_file_grouped}
fi

# Login to github to be able to query PR info
gh auth login

repo_url=$(gh repo view --json url --jq '.url')

# Extract tests and deploy notes from each feature PR
tests_section="## Tests\n\n"
notes_section="## Deploy Notes\n\n"

grep -v -E -- '- [a-z]+\(deps(-dev)?\)' ${pr_body_file} | grep -v -E -- '- (release|backport) v' | grep -v -E -- '- \d+\.\d+\.\d+ ' | while read line_item; do
  pr_id=$(echo ${line_item} | grep -o -E '\[`#\d+`\]' | grep -o -E '\d+')
  pr_content=$(gh pr view ${pr_id})

  tests=$(echo "$pr_content" | awk "/^## Test/{flag=1;next}/^## /{flag=0}flag" | sed -E "s/\[[Xx]\]/[ ]/" | sed -E "s/^(###+) /\1## /")
  if [[ ${tests} =~ [^[:space:]] ]]; then
    tests_section+="$(echo ${line_item} | sed "s/^- /### /")\n"
    tests_section+="${tests}\n\n"
  fi

  notes=$(echo "$pr_content" | awk "/^## Deploy Notes/{flag=1;next}/^## /{flag=0}flag" | sed -E "s/\[[Xx]\]/[ ]/" | sed -E "s/^(###+) /\1## /")
  if [[ ${notes} =~ [^[:space:]] ]]; then
    notes_section+="$(echo ${line_item} | sed "s/^- /### /")\n"
    notes_section+="${notes}\n\n"
  fi


echo "${tests_section}\n" >> ${pr_body_file_grouped}
echo "${notes_section}\n" >> ${pr_body_file_grouped}
echo "" >> ${pr_body_file_grouped}
echo "" >> ${pr_body_file_grouped}
echo "**Full Changelog**: ${repo_url}/compare/${current_version}..${release_version}" >> ${pr_body_file_grouped}

# release pr
release_pr_url=$(gh pr create \
  -H ${release_branch} \
  -B master \
  -t "release ${release_version}" \
  -F ${pr_body_file_grouped})

# backport pr
gh pr create \
  -H ${release_branch} \
  -B develop \
  -t "backport ${release_version}" \
  -b "Details in ${release_pr_url}"

# prep draft release
gh release create \
  --draft \
  --title "${release_version}" \
  --generate-notes \
  --notes-start-tag "${current_version}" \
  --verify-tag \
  "${release_version}"

# cleanup
rm ${pr_body_file}
rm ${pr_body_file_grouped}
git checkout develop
git branch -D ${release_branch}
