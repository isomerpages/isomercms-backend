const homepageContent = {
  frontMatter: {
    layout: "homepage",
    title: "abcdefg",
    description: "Brief site description here",
    image: "/images/isomer-logo.svg",
    permalink: "/",
    notification: "Here's a notification bar you can use!",
    sections: [
      {
        hero: {
          title: "Hero titlZZZZ",
          subtitle: "Hero subtitle",
          background: "/images/hero-banner.png",
          button: "Contact Us",
          url: "/contact-us/",
          key_highlights: [
            {
              title: "Highlight A",
              description: "Important highlight A is important",
              url: "https://google.com",
            },
            {
              title: "Highlight B",
              description: "Important highlight B is equally important",
              url: "https://gmail.com",
            },
            {
              title: "Page A",
              description: "Page A is important too",
              url: "/privacy/",
            },
          ],
        },
      },
      {
        infobar: {
          title: "Infobar title",
          subtitle: "Subtitle",
          description: "About a sentence worth of description here",
          button: "Button text",
          url: "/faq/",
        },
      },
    ],
  },
  pageBody: "\n\n\n\n\n\n\n\n\n\n\n\n",
}

const homepageSha = "homepageSha"

module.exports = {
  homepageContent,
  homepageSha,
}
