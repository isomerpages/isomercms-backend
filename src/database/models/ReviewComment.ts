import {
  Column,
  ForeignKey,
  Model,
  Table,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
} from "sequelize-typescript"

import { ReviewRequest } from "@database/models/ReviewRequest"
import { User } from "@database/models/User"

@Table({ tableName: "review_comments" })
export class ReviewComment extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @ForeignKey(() => User)
  @Column
  reviewerId!: number

  @ForeignKey(() => ReviewRequest)
  @Column
  reviewId!: number

  @Column
  comment!: string

  @BelongsTo(() => User, {
    onUpdate: "CASCADE",
  })
  user!: User

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
