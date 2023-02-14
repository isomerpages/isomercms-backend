import {
  Column,
  CreatedAt,
  DataType,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript"

@Table({ tableName: "otp" })
export class Otp extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @Column({
    allowNull: true,
    unique: true,
    type: DataType.TEXT,
  })
  email?: string | null

  @Column({
    allowNull: true,
    unique: true,
    type: DataType.TEXT,
  })
  mobileNumber?: string | null

  @Column({
    allowNull: false,
    type: DataType.TEXT,
    validate: {
      notEmpty: true,
    },
  })
  hashedOtp!: string

  // tracks number of times user attempts to submit the OTP code and log in
  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  attempts!: number

  @Column({
    allowNull: false,
    type: DataType.DATE,
  })
  expiresAt!: Date

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
