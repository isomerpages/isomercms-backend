import { sequelize } from "./database"

afterAll(() => sequelize.close())
