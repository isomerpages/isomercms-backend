const Joi = require("joi")

const {
  MAX_HERO_KEY_HIGHLIGHTS,
  MAX_ANNOUNCEMENT_ITEMS,
  MAX_TEXTCARDS_CARDS,
  MAX_INFOCOLS_BOXES,
} = require("@root/constants")
const { UserTypes } = require("@root/types/user")

const EmailSchema = Joi.string().email().required()

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
      locations: Joi.array().items(
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
      ),
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
      sections: Joi.array()
        .items(
          // Hero section
          Joi.object({
            hero: Joi.object({
              variant: Joi.string().allow(
                "side",
                "image",
                "floating",
                "center",
                ""
              ),
              backgroundColor: Joi.string().allow("black", "white", "gray", ""),
              background: Joi.string().allow(""),
              size: Joi.string().allow("sm", "md", ""),
              alignment: Joi.string().allow("left", "right", ""),
              title: Joi.string().allow(""),
              subtitle: Joi.string().allow(""),
              button: Joi.string().allow(""),
              url: Joi.string().allow(""),
              dropdown: Joi.object({
                title: Joi.string().required(),
                options: Joi.array().items(
                  Joi.object({
                    title: Joi.string().required(),
                    url: Joi.string().required(),
                  })
                ),
              }),
              key_highlights: Joi.array()
                .max(MAX_HERO_KEY_HIGHLIGHTS)
                .items(
                  Joi.object({
                    title: Joi.string().required(),
                    description: Joi.string().allow(""),
                    url: Joi.string().allow(""),
                  })
                ),
            }),
          }),

          // Resources section
          Joi.object({
            resources: Joi.object({
              title: Joi.string().allow(""),
              subtitle: Joi.string().allow(""),
              id: Joi.string().allow(""),
              button: Joi.string().allow(""),
            }),
          }),

          // Infobar section
          Joi.object({
            infobar: Joi.object({
              title: Joi.string().allow(""),
              subtitle: Joi.string().allow(""),
              id: Joi.string().allow(""),
              description: Joi.string().allow(""),
              button: Joi.string().allow(""),
              url: Joi.string().allow(""),
            }),
          }),

          // Infopic section
          Joi.object({
            infopic: Joi.object({
              title: Joi.string(),
              subtitle: Joi.string().allow(""),
              id: Joi.string().allow(""),
              description: Joi.string().allow(""),
              button: Joi.string().allow(""),
              url: Joi.string().allow(""),
              image: Joi.string(),
              alt: Joi.string(),
            }),
          }),

          // Announcements section
          Joi.object({
            announcements: Joi.object({
              title: Joi.string().allow(""),
              id: Joi.string().allow(""),
              subtitle: Joi.string().allow(""),
              announcement_items: Joi.array()
                .max(MAX_ANNOUNCEMENT_ITEMS)
                .items(
                  Joi.object({
                    title: Joi.string().required(),
                    date: Joi.string().required(),
                    announcement: Joi.string().required(),
                    link_text: Joi.string().allow(""),
                    link_url: Joi.string().allow(""),
                  })
                ),
            }),
          }),

          // Textcard section
          Joi.object({
            textcards: Joi.object({
              title: Joi.string().required(),
              id: Joi.string().allow(""),
              subtitle: Joi.string().allow(""),
              description: Joi.string().allow(""),
              cards: Joi.array()
                .max(MAX_TEXTCARDS_CARDS)
                .items(
                  Joi.object({
                    title: Joi.string().required(),
                    description: Joi.string().allow(""),
                    linktext: Joi.string().allow(""),
                    url: Joi.string().allow(""),
                  })
                ),
            }),
          }),

          // Infocols section
          Joi.object({
            infocols: Joi.object({
              title: Joi.string().required(),
              id: Joi.string().allow(""),
              subtitle: Joi.string().allow(""),
              url: Joi.string().allow(""),
              linktext: Joi.string().allow(""),
              infoboxes: Joi.array()
                .max(MAX_INFOCOLS_BOXES)
                .items(
                  Joi.object({
                    title: Joi.string().required(),
                    description: Joi.string().allow(""),
                  })
                ),
            }),
          })
        )
        .required(),
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

const DeleteMultipleMediaFilesRequestSchema = Joi.object().keys({
  items: Joi.array()
    .items(
      Joi.object().keys({
        filePath: Joi.string().required(),
        sha: Joi.string().required(),
      })
    )
    .required(),
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
                  external: Joi.boolean(),
                })
              ),
              false_collection: Joi.boolean(),
              external: Joi.boolean(),
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
  password: Joi.string().when("enablePassword", {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
  enablePassword: Joi.boolean().required(),
})

const VerifyRequestSchema = Joi.object().keys({
  email: EmailSchema,
  otp: Joi.string().required(),
})

const CreateCollaboratorRequestSchema = Joi.object().keys({
  email: EmailSchema,
  acknowledge: Joi.boolean().optional(),
})

const CollateUserFeedbackRequestSchema = Joi.object().keys({
  userType: Joi.string().valid(...Object.values(UserTypes)),
  rating: Joi.number().required(),
  feedback: Joi.string().optional(),
  email: Joi.string().required(),
})

const CreateReviewRequestSchema = Joi.object().keys({
  reviewers: Joi.array().items(Joi.string()).required(),
  title: Joi.string().required(),
  description: Joi.string().allow(""),
})

const UpdateReviewRequestSchema = Joi.object().keys({
  reviewers: Joi.array().items(Joi.string()).required(),
})

const CreateCommentSchema = Joi.object().keys({
  message: Joi.string().required(),
})

const LaunchSiteSchema = Joi.object().keys({
  siteUrl: Joi.string().required(),
  useWwwSubdomain: Joi.boolean().required(),
})

const GetPreviewInfoSchema = Joi.object().keys({
  sites: Joi.array().items(Joi.string()).required(),
})

const VerifyEmailOtpSchema = Joi.object().keys({
  email: EmailSchema,
  otp: Joi.string().length(6).required(),
})

const VerifyMobileNumberOtpSchema = Joi.object().keys({
  mobile: Joi.string().required(),
  otp: Joi.string().length(6).required(),
})

const ResetRepoSchema = Joi.object().keys({
  branchName: Joi.string().required(),
  commitSha: Joi.string().required(),
})

module.exports = {
  EmailSchema,
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
  DeleteMultipleMediaFilesRequestSchema,
  UpdateNavigationRequestSchema,
  UpdateSettingsRequestSchema,
  UpdateRepoPasswordRequestSchema,
  VerifyRequestSchema,
  CreateCollaboratorRequestSchema,
  CollateUserFeedbackRequestSchema,
  CreateReviewRequestSchema,
  UpdateReviewRequestSchema,
  CreateCommentSchema,
  LaunchSiteSchema,
  GetPreviewInfoSchema,
  VerifyEmailOtpSchema,
  VerifyMobileNumberOtpSchema,
  ResetRepoSchema,
}
