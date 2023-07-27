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
    primaryKey: true,
    allowNull: false,
    type: DataType.TEXT,
  })
  id!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
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
