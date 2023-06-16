const Joi = require("joi")

const FileSchema = Joi.object().keys({
  name: Joi.string().required(),
  type: Joi.string().valid("file").required(),
})

const ItemSchema = FileSchema.keys({
  type: Joi.string().valid("file", "dir").required(),
  children: Joi.array().items(Joi.string()),
})

// Contact Us
const UpdateContactUsSchema = Joi.object({
  content: Joi.object({
    frontMatter: Joi.object({
      layout: Joi.string().required(),
      title: Joi.string().required(),
      permalink: Joi.string().required(),
      feedback: Joi.string().allow(""),
      agency_name: Joi.string().required(),
      locations: Joi.array()
        .items(
          Joi.object({
            address: Joi.array().items(Joi.string().allow("")),
            operating_hours: Joi.array().items(
              Joi.object({
                days: Joi.string().allow(""),
                time: Joi.string().allow(""),
                description: Joi.string().allow(""),
              })
            ),
            maps_link: Joi.string().allow(""),
            title: Joi.string().allow(""),
          })
        )
        .required(),
      contacts: Joi.array()
        .items(
          Joi.object({
            content: Joi.array().items(
              Joi.object({
                phone: Joi.string().allow(""),
                email: Joi.string().allow(""),
                other: Joi.string().allow(""),
              })
            ),
            title: Joi.string().allow(""),
          })
        )
        .required(),
    }).required(),
    pageBody: Joi.string().allow(""),
  }).required(),
  sha: Joi.string().required(),
})

// Homepage
const UpdateHomepageSchema = Joi.object({
  content: Joi.object({
    frontMatter: Joi.object({
      layout: Joi.string().required(),
      title: Joi.string().required(),
      description: Joi.string().allow(""),
      permalink: Joi.string().required(),
      notification: Joi.string().allow(""),
      image: Joi.string(),
      sections: Joi.array().required(),
    }).required(),
    pageBody: Joi.string().allow(""), // Joi does not allow empty string (pageBody: '') for Joi.string() even if not required
  }).required(),
  sha: Joi.string().required(),
})

// Pages
const FrontMatterSchema = Joi.object({
  title: Joi.string().required(),
  permalink: Joi.string().required(),
  third_nav_title: Joi.string(),
}).unknown(true)

const ContentSchema = Joi.object({
  frontMatter: FrontMatterSchema.required(),
  pageBody: Joi.string().allow(""),
})

const CreatePageRequestSchema = Joi.object().keys({
  content: ContentSchema.required(),
  newFileName: Joi.string().required(),
})

const UpdatePageRequestSchema = Joi.object().keys({
  content: ContentSchema.required(),
  sha: Joi.string().required(),
  newFileName: Joi.string(),
})

const DeletePageRequestSchema = Joi.object().keys({
  sha: Joi.string().required(),
})

// Resource Pages
const ResourceFrontMatterSchema = Joi.object({
  title: Joi.string().required(),
  date: Joi.string(),
  permalink: Joi.string(),
  layout: Joi.string().valid("post", "file", "link"),
  file_url: Joi.string(),
  external: Joi.string(),
}).unknown(true)

const ResourceContentSchema = Joi.object({
  frontMatter: ResourceFrontMatterSchema.required(),
  pageBody: Joi.string().allow(""),
})

const CreateResourcePageRequestSchema = Joi.object().keys({
  content: ResourceContentSchema.required(),
  newFileName: Joi.string().required(),
})

const UpdateResourcePageRequestSchema = Joi.object().keys({
  content: ResourceContentSchema.required(),
  sha: Joi.string().required(),
  newFileName: Joi.string(),
})

const DeleteResourcePageRequestSchema = Joi.object().keys({
  sha: Joi.string().required(),
})

// Collections
const CreateDirectoryRequestSchema = Joi.object().keys({
  newDirectoryName: Joi.string().required(),
  items: Joi.array().items(FileSchema),
})

const RenameDirectoryRequestSchema = Joi.object().keys({
  newDirectoryName: Joi.string().required(),
})

const ReorderDirectoryRequestSchema = Joi.object().keys({
  items: Joi.array().items(ItemSchema).required(),
})

const MoveDirectoryPagesRequestSchema = Joi.object().keys({
  target: Joi.object()
    .keys({
      collectionName: Joi.string(),
      subCollectionName: Joi.string(),
    })
    .required(),
  items: Joi.array().items(FileSchema).required(),
})

// Resource categories
const CreateResourceDirectoryRequestSchema = Joi.object().keys({
  newDirectoryName: Joi.string().required(),
  items: Joi.array().items(FileSchema),
})

const RenameResourceDirectoryRequestSchema = Joi.object().keys({
  newDirectoryName: Joi.string().required(),
})

const MoveResourceDirectoryPagesRequestSchema = Joi.object().keys({
  target: Joi.object()
    .keys({
      resourceRoomName: Joi.string(),
      resourceCategoryName: Joi.string().required(),
    })
    .required(),
  items: Joi.array().items(FileSchema).required(),
})

// Media
const CreateMediaDirectoryRequestSchema = Joi.object().keys({
  newDirectoryName: Joi.string().required(),
  items: Joi.array().items(FileSchema),
})

const RenameMediaDirectoryRequestSchema = Joi.object().keys({
  newDirectoryName: Joi.string().required(),
})

const MoveMediaDirectoryFilesRequestSchema = Joi.object().keys({
  target: Joi.object()
    .keys({
      directoryName: Joi.string().required(),
    })
    .required(),
  items: Joi.array().items(FileSchema).required(),
})

const CreateMediaFileRequestSchema = Joi.object().keys({
  content: Joi.string().required(),
  newFileName: Joi.string().required(),
})

const UpdateMediaFileRequestSchema = Joi.object().keys({
  content: Joi.string(),
  sha: Joi.string().required(),
  newFileName: Joi.string(),
})

const DeleteMediaFileRequestSchema = Joi.object().keys({
  sha: Joi.string().required(),
})

const UpdateNavigationRequestSchema = Joi.object().keys({
  content: Joi.object()
    .keys({
      logo: Joi.string().allow(""),
      links: Joi.array()
        .items(
          Joi.object()
            .keys({
              title: Joi.string().required(),
              url: Joi.string(),
              collection: Joi.string(),
              resource_room: Joi.boolean().valid(true),
              sublinks: Joi.array().items(
                Joi.object().keys({
                  title: Joi.string().required(),
                  url: Joi.string().required(),
                })
              ),
            })
            .oxor("url", "collection", "resource_room")
            .oxor("sublinks", "collection")
            .oxor("sublinks", "resource_room")
        )
        .required(),
    })
    .required(),
  sha: Joi.string().required(),
})

const UpdateSettingsRequestSchema = Joi.object().keys({
  url: Joi.string().domain().allow(""),
  colors: Joi.object().keys({
    "primary-color": Joi.string().required(),
    "secondary-color": Joi.string().required(),
    "media-colors": Joi.array().items(
      Joi.object().keys({
        title: Joi.string().required(),
        color: Joi.string().allow(""),
      })
    ),
  }),
  favicon: Joi.string(),
  "facebook-pixel": Joi.string()
    .regex(/^[0-9]{15,16}$/)
    .allow(""),
  google_analytics: Joi.string().allow(""),
  google_analytics_ga4: Joi.string().allow(""),
  "linkedin-insights": Joi.string().allow(""),
  is_government: Joi.boolean(),
  shareicon: Joi.string().allow(""),
  title: Joi.string().allow(""),
  description: Joi.string().allow(""),
  contact_us: Joi.string().allow(""),
  feedback: Joi.string().allow(""),
  faq: Joi.string().allow(""),
  show_reach: Joi.boolean(),
  social_media: Joi.object().keys({
    facebook: Joi.string().allow(""),
    twitter: Joi.string().allow(""),
    youtube: Joi.string().allow(""),
    instagram: Joi.string().allow(""),
    linkedin: Joi.string().allow(""),
    telegram: Joi.string().allow(""),
    tiktok: Joi.string().allow(""),
  }),
  logo: Joi.string().allow(""),
})

const UpdateRepoPasswordRequestSchema = Joi.object().keys({
  encryptedPassword: Joi.string(),
  iv: Joi.string(),
})

module.exports = {
  UpdateContactUsSchema,
  UpdateHomepageSchema,
  CreatePageRequestSchema,
  UpdatePageRequestSchema,
  DeletePageRequestSchema,
  CreateResourcePageRequestSchema,
  UpdateResourcePageRequestSchema,
  DeleteResourcePageRequestSchema,
  CreateDirectoryRequestSchema,
  RenameDirectoryRequestSchema,
  ReorderDirectoryRequestSchema,
  MoveDirectoryPagesRequestSchema,
  CreateResourceDirectoryRequestSchema,
  RenameResourceDirectoryRequestSchema,
  MoveResourceDirectoryPagesRequestSchema,
  CreateMediaDirectoryRequestSchema,
  RenameMediaDirectoryRequestSchema,
  MoveMediaDirectoryFilesRequestSchema,
  CreateMediaFileRequestSchema,
  UpdateMediaFileRequestSchema,
  DeleteMediaFileRequestSchema,
  UpdateNavigationRequestSchema,
  UpdateSettingsRequestSchema,
  UpdateRepoPasswordRequestSchema,
}
