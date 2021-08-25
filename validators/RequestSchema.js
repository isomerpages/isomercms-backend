const Joi = require("joi")

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

// Collections
const FileSchema = Joi.object().keys({
  name: Joi.string().required(),
  type: Joi.string().valid("file").required(),
  children: Joi.array().items(Joi.string()),
})

const ItemSchema = FileSchema.keys({
  type: Joi.string().valid("file", "dir").required(),
})

const CreateDirectoryRequestSchema = Joi.object().keys({
  newDirectoryName: Joi.string().required(),
  items: Joi.array().items(FileSchema),
})

const RenameDirectoryRequestSchema = Joi.object().keys({
  newDirectoryName: Joi.string().required(),
})

const ReorderDirectoryRequestSchema = Joi.array().items(ItemSchema)

module.exports = {
  CreatePageRequestSchema,
  UpdatePageRequestSchema,
  DeletePageRequestSchema,
  CreateDirectoryRequestSchema,
  RenameDirectoryRequestSchema,
  ReorderDirectoryRequestSchema,
}
