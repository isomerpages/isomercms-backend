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

  @Column({
    allowNull: false,
    type: DataType.BOOLEAN,
    defaultValue: false,
    validate: {
      notEmpty: true,
    },
  })
  isReserved!: boolean

  @Column({
    allowNull: true,
    type: DataType.DATE,
  })
  resetTime!: Date | null

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
