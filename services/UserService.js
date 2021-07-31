class UserService {
  constructor(repository) {
    this.repository = repository
  }

  async findByEmail(email) {
    return this.repository.findOne({ where: { email } })
  }

  async findOrCreate(email, contactNumber) {
    const [user] = await this.repository.findOrCreate({
      where: { email, contactNumber: contactNumber || null },
    })
    return user
  }
}

module.exports = UserService
