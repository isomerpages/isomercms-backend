import {
  Column,
  ForeignKey,
  Model,
  Table,
  DataType,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript"

import { User } from "@database/models/User"

import { ReviewRequest } from "./ReviewRequest"

@Table({ tableName: "review_comments" })
export class Reviewer extends Model {
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
  requestId!: string

  @Column
  comment!: string

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
