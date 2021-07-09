import Joi from "joi"

const FrontMatterSchema = Joi.object({
  title: Joi.string().required(),
  permalink: Joi.string().required(),
})

export const CreatePageRequestSchema = Joi.object().keys({
  frontMatter: FrontMatterSchema,
  pageBody: Joi.string().required(),
  newFileName: Joi.string().required(),
})

export const UpdatePageRequestSchema = Joi.object().keys({
  frontMatter: FrontMatterSchema,
  pageBody: Joi.string().required(),
  sha: Joi.string().required(),
  newFileName: Joi.string().required(),
})

export const DeletePageRequestSchema = Joi.object().keys({
  sha: Joi.string().required(),
})
