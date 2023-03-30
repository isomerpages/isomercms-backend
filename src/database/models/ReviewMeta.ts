import {
  DataType,
  Column,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript"

import { ReviewRequest } from "./ReviewRequest"
import { User } from "./User"

@Table({ tableName: "review_meta" })
// eslint-disable-next-line import/prefer-default-export
export class ReviewMeta extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @ForeignKey(() => User)
  reviewerId!: number

  @ForeignKey(() => ReviewRequest)
  reviewId!: number

  @BelongsTo(() => ReviewRequest)
  reviewRequest!: ReviewRequest

  @Column({
    allowNull: false,
    type: DataType.BIGINT,
  })
  pullRequestNumber!: number

  @Column({
    allowNull: false,
    type: DataType.STRING,
  })
  reviewLink!: string
}
