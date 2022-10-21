import {
  ForeignKey,
  DataType,
  Column,
  Model,
  Table,
  BelongsTo,
  PrimaryKey,
} from "sequelize-typescript"

import { ReviewRequest } from "@database/models/ReviewRequest"
import { Site } from "@database/models/Site"
import { User } from "@database/models/User"

@Table({ tableName: "review_request_views" })
// eslint-disable-next-line import/prefer-default-export
export class ReviewRequestView extends Model {
  @ForeignKey(() => ReviewRequest)
  @PrimaryKey
  @Column
  reviewRequestId!: number

  @BelongsTo(() => ReviewRequest, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  reviewRequest!: ReviewRequest

  @ForeignKey(() => Site)
  @PrimaryKey
  @Column
  siteId!: number

  @BelongsTo(() => Site, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  site!: Site

  @ForeignKey(() => User)
  @PrimaryKey
  @Column
  userId!: number

  @BelongsTo(() => User, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  user!: User

  @Column({
    allowNull: true,
    type: DataType.DATE,
  })
  lastViewedAt!: Date
}
