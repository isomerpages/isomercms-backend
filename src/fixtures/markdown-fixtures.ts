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

export const rawInstagramEmbedScript =
  '<script src="//www.instagram.com/embed.js" async></script>'

export const sanitizedInstagramEmbedScript =
  '<script async="" src="//www.instagram.com/embed.js"></script>'

export const frontMatterWithSymbolAndHtmlBody = `---
title: Digital Strategy & the 101 of Search Engine Optimisation (SEO)
permalink: /digital-programmes/masterclasses-and-workshops/digital-strategy-and-the-101-of-seo/
breadcrumb: Digital Strategy &amp; the 101 of Search Engine Optimisation (SEO)
third_nav_title: Masterclasses &amp; Workshops
description: ""
---
<b>&something</b>`

export const frontMatterWithSymbolWithoutBodyAndHtml = `---
title: Digital Strategy & the 101 of Search Engine Optimisation (SEO)
permalink: /digital-programmes/masterclasses-and-workshops/digital-strategy-and-the-101-of-seo/
breadcrumb: Digital Strategy &amp; the 101 of Search Engine Optimisation (SEO)
third_nav_title: Masterclasses &amp; Workshops
description: ""
---`

export const frontMatterWithSymbolAndBodyWithoutHtml = `---
title: Digital Strategy & the 101 of Search Engine Optimisation (SEO)
permalink: /digital-programmes/masterclasses-and-workshops/digital-strategy-and-the-101-of-seo/
breadcrumb: Digital Strategy &amp; the 101 of Search Engine Optimisation (SEO)
third_nav_title: Masterclasses &amp; Workshops
description: ""
---
something`

export const frontMatterWithSymbolAndHtml = `---
title: <b>Digital Strategy & the 101 of Search Engine Optimisation (SEO)</b>
permalink: /digital-programmes/masterclasses-and-workshops/digital-strategy-and-the-101-of-seo/
breadcrumb: Digital Strategy &amp; the 101 of Search Engine Optimisation (SEO)
third_nav_title: Masterclasses &amp; Workshops
description: ""
---`

export const escapedFrontMatterWithSymbolAndHtml = `---
title: <b>Digital Strategy &amp; the 101 of Search Engine Optimisation (SEO)</b>
permalink: /digital-programmes/masterclasses-and-workshops/digital-strategy-and-the-101-of-seo/
breadcrumb: Digital Strategy &amp; the 101 of Search Engine Optimisation (SEO)
third_nav_title: Masterclasses &amp; Workshops
description: ""
---`

export const escapedFrontMatterWithSymbolAndHtmlBody = `---
title: Digital Strategy &amp; the 101 of Search Engine Optimisation (SEO)
permalink: /digital-programmes/masterclasses-and-workshops/digital-strategy-and-the-101-of-seo/
breadcrumb: Digital Strategy &amp; the 101 of Search Engine Optimisation (SEO)
third_nav_title: Masterclasses &amp; Workshops
description: ""
---
<b>&amp;something</b>`
