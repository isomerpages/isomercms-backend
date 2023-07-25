import {
  Column,
  CreatedAt,
  DataType,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript"

@Table({ tableName: "sgid_login" })
export class SgidLogin extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @Column({
    allowNull: false,
    type: DataType.STRING,
  })
  state!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  nonce!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  codeVerifier!: string

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
