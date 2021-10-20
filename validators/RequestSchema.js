const { required } = require("@root/node_modules/joi/lib/index")
const Joi = require("joi")

const FileSchema = Joi.object().keys({
  name: Joi.string().required(),
  type: Joi.string().valid("file").required(),
})

const ItemSchema = FileSchema.keys({
  type: Joi.string().valid("file", "dir").required(),
  children: Joi.array().items(Joi.string()),
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
  date: Joi.string().required(),
  permalink: Joi.string().required(),
  layout: Joi.string().valid("post"),
  file_url: Joi.string(),
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
})

const RenameResourceDirectoryRequestSchema = Joi.object().keys({
  newDirectoryName: Joi.string().required(),
})

const MoveResourceDirectoryPagesRequestSchema = Joi.object().keys({
  target: Joi.object()
    .keys({
      resourceCategory: Joi.string().required(),
    })
    .required(),
  items: Joi.array().items(FileSchema).required(),
})
const UpdateSettingsRequestSchema = Joi.object().keys({
  configSettings: Joi.object()
    .keys({
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
      "facebook-pixel": Joi.string().allow(""),
      google_analytics: Joi.string().allow(""),
      "linkedin-insights": Joi.string().allow(""),
      is_government: Joi.boolean(),
      shareicon: Joi.string().allow(""),
      title: Joi.string().allow(""),
      description: Joi.string().allow(""),
    })
    .required(),
  footerSettings: Joi.object()
    .keys({
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
    })
    .required(),
  navigationSettings: Joi.object()
    .keys({
      logo: Joi.string(),
    })
    .required(),
})

module.exports = {
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
  UpdateSettingsRequestSchema,
}
