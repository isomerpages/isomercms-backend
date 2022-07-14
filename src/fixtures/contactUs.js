const rawContactUsContent = `---
layout: contact_us
title: Contact Us
permalink: /contact-us/
agency_name: Agency Name
locations:
  - address:
      - 31 Sesame Street
      - Big Bird Building
      - Singapore 123456
    operating_hours:
      - days: Mon - Fri
        time: 8.30am - 6.00pm
        description: Closed on Public Holidays
      - days: Sat
        time: 8.30am - 12.00pm
        description: ""
    maps_link: ""
    title: Main Office
  - address:
      - 109 North Bridge Road
      - Singapore 179097
      - ""
    operating_hours: []
    maps_link: https://goo.gl/maps/C8VfxphGxT2GsfcaA
    title: Branch Office
contacts:
  - content:
      - phone: +65 6123 4567
      - email: enquiries@abc.gov.sg
      - other: Any text here <i>including HTML</i>
    title: General Enquiries & Feedback
  - content:
      - phone: ""
      - email: careers@abc.gov.sg
      - other: ""
    title: Careers
---
`

const contactUsContent = {
  frontMatter: {
    layout: "contact_us",
    title: "Contact Us",
    permalink: "/contact-us/",
    agency_name: "Agency Name",
    locations: [
      {
        address: ["31 Sesame Street", "Big Bird Building", "Singapore 123456"],
        operating_hours: [
          {
            days: "Mon - Fri",
            time: "8.30am - 6.00pm",
            description: "Closed on Public Holidays",
          },
          {
            days: "Sat",
            time: "8.30am - 12.00pm",
            description: "",
          },
        ],
        maps_link: "",
        title: "Main Office",
      },
      {
        address: ["109 North Bridge Road", "Singapore 179097", ""],
        operating_hours: [],
        maps_link: "https://goo.gl/maps/C8VfxphGxT2GsfcaA",
        title: "Branch Office",
      },
    ],
    contacts: [
      {
        content: [
          { phone: "+65 6123 4567" },
          { email: "enquiries@abc.gov.sg" },
          { other: "Any text here <i>including HTML</i>" },
        ],
        title: "General Enquiries & Feedback",
      },
      {
        content: [
          { phone: "" },
          { email: "careers@abc.gov.sg" },
          { other: "" },
        ],
        title: "Careers",
      },
    ],
  },
  pageBody: "\n",
}

const contactUsSha = "contactUsSha"

module.exports = {
  contactUsContent,
  contactUsSha,
  rawContactUsContent,
}
