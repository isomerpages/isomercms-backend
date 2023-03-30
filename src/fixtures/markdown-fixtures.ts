const normalFrontMatter = `layout: simple-page
title: Digital Transformation
permalink: /digital-transformation/
breadcrumb: Digital Transformation`

const maliciousFrontMatter = `layout: simple-page<script>alert('Evil layout')</script>
title: Digital Transformation
permalink: /digital-transformation/<script>alert('Evil permalink')</script>
breadcrumb: Digital Transformation`

const normalPageContent = `### Test header
### **Subheader**
Content
![Image](/path/to-image.jpg)`

const maliciousPageContent = `### Test header
### **Subheader**
Content<script>alert('Evil in markdown')</script>
![Image](/path/to-image.jpg)`

export const normalMarkdownContent = `---
${normalFrontMatter}
---
${normalPageContent}`

export const maliciousMarkdownContent = `---
${maliciousFrontMatter}
---
${maliciousPageContent}`

export const normalJsonObject = {
  frontMatter: {
    layout: "simple-page",
    title: "Digital Transformation",
    permalink: "/digital-transformation/",
    breadcrumb: "Digital Transformation",
  },
  pageContent: normalPageContent,
}
export const maliciousJsonObject = {
  frontMatter: {
    layout: "simple-page<script>alert('Evil frontmatter')</script>",
    title: "Digital Transformation",
    permalink: "/digital-transformation/",
    breadcrumb: "Digital Transformation",
  },
  pageContent: maliciousPageContent,
}
