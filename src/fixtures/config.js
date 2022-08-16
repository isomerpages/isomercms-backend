const rawConfigContent = `title: abcdefg
description: Brief site description here
url: https://abc.gov.sg
favicon: /images/isomer-logo.svg
colors:
  primary-color: "#d10404"
  secondary-color: "#09b709"
  media-colors:
    - title: media-color-one
      color: "#162938"
    - title: media-color-two
      color: "#8a3ce0"
    - title: media-color-three
      color: "#18808d"
    - title: media-color-four
      color: "#22b0c3"
    - title: media-color-five
      color: "#0b3033"
permalink: none
baseurl: ""
exclude:
  - travis-script.js
  - .travis.yml
  - README.md
  - package.json
  - package-lock.json
  - node_modules
  - vendor/bundle/
  - vendor/cache/
  - vendor/gems/
  - vendor/ruby/
  - Gemfile
  - Gemfile.lock
include:
  - _redirects
defaults:
  - scope:
      path: ""
    values:
      layout: page
custom_css_path: /misc/custom.css
custom_print_css_path: /assets/css/print.css
paginate: 12
remote_theme: isomerpages/isomerpages-template@next-gen
safe: false
plugins:
  - jekyll-feed
  - jekyll-assets
  - jekyll-paginate
  - jekyll-sitemap
  - jekyll-remote-theme
staging: https://e2e-test-repo-staging.netlify.app
prod: https://e2e-test-repo-prod.netlify.app
resources_name: resources
is_government: false
shareicon: /images/isomer-logo.svg
facebook-pixel: "true"
google_analytics: UA-39345131-33
linkedin-insights: "12345"
`

const configContent = {
  title: "abcdefg",
  description: "Brief site description here",
  url: "https://abc.gov.sg",
  favicon: "/images/isomer-logo.svg",
  colors: {
    "primary-color": "#d10404",
    "secondary-color": "#09b709",
    "media-colors": [
      { title: "media-color-one", color: "#162938" },
      { title: "media-color-two", color: "#8a3ce0" },
      { title: "media-color-three", color: "#18808d" },
      { title: "media-color-four", color: "#22b0c3" },
      { title: "media-color-five", color: "#0b3033" },
    ],
  },
  permalink: "none",
  baseurl: "",
  exclude: [
    "travis-script.js",
    ".travis.yml",
    "README.md",
    "package.json",
    "package-lock.json",
    "node_modules",
    "vendor/bundle/",
    "vendor/cache/",
    "vendor/gems/",
    "vendor/ruby/",
    "Gemfile",
    "Gemfile.lock",
  ],
  include: ["_redirects"],
  defaults: [{ scope: { path: "" }, values: { layout: "page" } }],
  custom_css_path: "/misc/custom.css",
  custom_print_css_path: "/assets/css/print.css",
  paginate: 12,
  remote_theme: "isomerpages/isomerpages-template@next-gen",
  safe: false,
  plugins: [
    "jekyll-feed",
    "jekyll-assets",
    "jekyll-paginate",
    "jekyll-sitemap",
    "jekyll-remote-theme",
  ],
  staging: "https://e2e-test-repo-staging.netlify.app",
  prod: "https://e2e-test-repo-prod.netlify.app",
  resources_name: "resources",
  is_government: false,
  shareicon: "/images/isomer-logo.svg",
  "facebook-pixel": "true",
  google_analytics: "UA-39345131-33",
  "linkedin-insights": "12345",
}

const configSha = "configsha"

const configResponse = {
  url: configContent.url,
  title: configContent.title,
  description: configContent.description,
  favicon: configContent.favicon,
  shareicon: configContent.shareicon,
  is_government: configContent.is_government,
  facebook_pixel: configContent["facebook-pixel"],
  google_analytics: configContent.google_analytics,
  linkedin_insights: configContent["linkedin-insights"],
  colors: configContent.colors,
}

module.exports = {
  configContent,
  configSha,
  configResponse,
  rawConfigContent,
}
