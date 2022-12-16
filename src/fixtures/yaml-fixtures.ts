export const normalYamlString = `
logo: /path-to/logo.png
links:
  - title: TitleA
    url: /title-a
  - title: TitleB
    url: /title-b
  - title: TitleC
    url: /title-c
    sublinks:
      - title: sublink-1
        url: /sublink-1
      - title: sublink-2
        url: /sublink-2
`
export const maliciousYamlString = `
logo: /path-to/logo.png <script>alert('Logo')</script>
links:
  - title: TitleA<script>alert('Title A')</script>
    url: /title-a
  - title: TitleB
    url: /title-b<script>alert('Title B URL')</script>
  - title: TitleC
    url: /title-c
    sublinks:
      - title: sublink-1<script>alert('sublink1 title')</script>
        url: /sublink-1
      - title: sublink-2
        url: <script>alert('sublink2 url')</script>/sublink-2
`

export const normalYamlObject = {
  logo: "/path-to/logo.png",
  links: [
    { title: "TitleA", url: "/title-a" },
    { title: "TitleB", url: "/title-b" },
    {
      title: "TitleC",
      url: "/title-c",
      sublinks: [
        { title: "sublink-1", url: "/sublink-1" },
        { title: "sublink-2", url: "/sublink-2" },
      ],
    },
  ],
}
export const maliciousYamlObject = {
  logo: "/path-to/logo.png",
  links: [
    { title: "TitleA<script>alert('Title A')</script>", url: "/title-a" },
    { title: "TitleB", url: "/title-b<script>alert('Title B URL')</script>" },
    {
      title: "TitleC",
      url: "/title-c",
      sublinks: [
        {
          title: "sublink-1<script>alert('sublink1 title')</script>",
          url: "/sublink-1",
        },
        {
          title: "sublink-2",
          url: "<script>alert('sublink2 url')</script>/sublink-2",
        },
      ],
    },
  ],
}
