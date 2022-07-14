import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript"

@Table({ tableName: "access_tokens" })
export class AccessToken extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @Column({
    allowNull: false,
    unique: true,
    type: DataType.TEXT,
    validate: {
      notEmpty: true,
    },
  })
  token!: string

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
