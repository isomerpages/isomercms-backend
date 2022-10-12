import {
  ForeignKey,
  DataType,
  Column,
  Model,
  Table,
  BelongsTo,
  BelongsToMany,
  HasOne,
} from "sequelize-typescript"

import { Site } from "@database/models/Site"
import { User } from "@database/models/User"
import { ReviewRequestStatus } from "@root/constants"

import { Reviewer } from "./Reviewers"
import { ReviewMeta } from "./ReviewMeta"

@Table({ tableName: "review_requests" })
// eslint-disable-next-line import/prefer-default-export
export class ReviewRequest extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @ForeignKey(() => User)
  requestorId!: number

  // NOTE: Because this is a FK to User,
  // when User is updated/deleted,
  // the corresponding row in ReviewRequest will also be updated.
  @BelongsTo(() => User, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  requestor!: User

  @ForeignKey(() => Site)
  siteId!: number

  // See above comment wrt CASCADE
  @BelongsTo(() => Site, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  site!: Site

  @HasOne(() => ReviewMeta)
  reviewMeta!: ReviewMeta

  @Column({
    allowNull: false,
    defaultValue: "OPEN",
    type: DataType.ENUM(...Object.values(ReviewRequestStatus)),
  })
  reviewStatus!: ReviewRequestStatus

  @BelongsToMany(() => User, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    through: () => Reviewer,
    as: "reviewers",
  })
  reviewers!: User[]
}
