import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript"

@Table({ tableName: "whitelists" })
export class Whitelist extends Model {
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
  email!: string

  @Column({
    allowNull: true,
    type: DataType.DATE,
    defaultValue: null,
  })
  expiry!: Date

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
