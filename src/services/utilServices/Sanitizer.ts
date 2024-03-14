import DOMPurify from "isomorphic-dompurify"

/**
 * While we do have a CSP in place, we want to further restrict the content that
 * that the user can input.
 * NOTE: Any changes to this list should also be updated in frontend code
 */
const ALLOWED_SRC = [
  "//www.instagram.com/embed.js",
  "/jquery/resize-tables.js",
  "/jquery/jquery.min.js",
  "/jquery/bp-menu-new-tab.js",
]

DOMPurify.setConfig({
  ADD_TAGS: ["iframe", "script"],
  ADD_ATTR: [
    "allow",
    "allowfullscreen",
    "frameborder",
    "scrolling",
    "marginheight",
    "marginwidth",
    "target",
    "async",
  ],
  // required in case <script> tag appears as the first line of the markdown
  FORCE_BODY: true,
})
DOMPurify.addHook("uponSanitizeElement", (node, data) => {
  // Allow script tags if it has a src attribute

  const hasUnallowedSrcValue =
    data.tagName === "script" &&
    !(
      node.hasAttribute("src") &&
      node.innerHTML === "" &&
      ALLOWED_SRC.includes(node.getAttribute("src") ?? "")
    )

  const hasUnallowedScriptAttribute =
    data.tagName === "script" &&
    (node.hasAttribute("href") || node.hasAttribute("xlink:href"))

  if (hasUnallowedSrcValue || hasUnallowedScriptAttribute) {
    // Adapted from https://github.com/cure53/DOMPurify/blob/e0970d88053c1c564b6ccd633b4af7e7d9a10375/src/purify.js#L719-L736
    DOMPurify.removed.push({ element: node })
    try {
      if (!node.parentNode) {
        throw new Error("parent node is not defined")
      }
      node.parentNode.removeChild(node)
    } catch (e) {
      try {
        // eslint-disable-next-line no-param-reassign
        node.outerHTML = ""
      } catch (ex) {
        node.remove()
      }
    }
  }
})

// NOTE: Doing a re-export so that clients always use the correct config
export const sanitizer = DOMPurify
export default sanitizer
