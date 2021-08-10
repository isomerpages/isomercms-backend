const Joi = require("joi")

const FrontMatterSchema = Joi.object({
  title: Joi.string().required(),
  permalink: Joi.string().required(),
})

const ContentSchema = Joi.object({
  frontMatter: FrontMatterSchema,
  pageBody: Joi.string().allow(""),
})

const CreatePageRequestSchema = Joi.object().keys({
  content: ContentSchema,
  newFileName: Joi.string().required(),
})

const UpdatePageRequestSchema = Joi.object().keys({
  content: ContentSchema,
  sha: Joi.string().required(),
  newFileName: Joi.string().required(),
})

const DeletePageRequestSchema = Joi.object().keys({
  sha: Joi.string().required(),
})

module.exports = {
  CreatePageRequestSchema,
  UpdatePageRequestSchema,
  DeletePageRequestSchema,
}
