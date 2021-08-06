const Joi = require("joi")

const FrontMatterSchema = Joi.object({
  title: Joi.string().required(),
  permalink: Joi.string().required(),
})

const CreatePageRequestSchema = Joi.object().keys({
  frontMatter: FrontMatterSchema,
  pageBody: Joi.string().allow(""),
  newFileName: Joi.string().required(),
})

const UpdatePageRequestSchema = Joi.object().keys({
  frontMatter: FrontMatterSchema,
  pageBody: Joi.string().allow(""),
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
