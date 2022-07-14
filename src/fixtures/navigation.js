const rawNavigationContent = `logo: /images/favicon-isomer.ico
links:
  - title: Contact Us
    url: /contact-us/
  - title: Test
    url: /Test/
  - title: Resources
    resource_room: true
  - title: Test Folder Title No Pages
    collection: test-folder-title-no-pages
  - title: Menu Title
    url: /menu
    sublinks:
      - title: Submenu Title
        url: /submenu
      - title: Submenu Title 2
        url: /submenu-2
`

const navigationContent = {
  logo: "/images/favicon-isomer.ico",
  links: [
    { title: "Contact Us", url: "/contact-us/" },
    { title: "Test", url: "/Test/" },
    { title: "Resources", resource_room: true },
    {
      title: "Test Folder Title No Pages",
      collection: "test-folder-title-no-pages",
    },
    {
      title: "Menu Title",
      url: "/menu",
      sublinks: [
        { title: "Submenu Title", url: "/submenu" },
        { title: "Submenu Title 2", url: "/submenu-2" },
      ],
    },
  ],
}

const navigationSha = "navigationSha"

const navigationResponse = {
  logo: navigationContent.logo,
}

module.exports = {
  navigationContent,
  navigationSha,
  navigationResponse,
  rawNavigationContent,
}
