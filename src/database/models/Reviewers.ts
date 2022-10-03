import {
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript"

import { User } from "@database/models/User"

import { ReviewRequest } from "./ReviewRequest"

@Table({ tableName: "reviewers" })
export class Reviewer extends Model {
  @ForeignKey(() => User)
  @Column
  reviewerId!: number

  @ForeignKey(() => ReviewRequest)
  @Column
  requestId!: string
}
