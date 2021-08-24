class UserService {
  constructor({ repository }) {
    this.repository = repository
  }

  async findByEmail(email) {
    return this.repository.findOne({ where: { email } })
  }

  async findByGitHubId(githubId) {
    return this.repository.findOne({ where: { githubId } })
  }

  async updateUserByGitHubId(githubId, user) {
    await this.repository.update(user, { where: { githubId } })
  }

  async findOrCreate(githubId, contactNumber) {
    const [user] = await this.repository.findOrCreate({
      where: { githubId, contactNumber: contactNumber || null },
    })
    return user
  }
}

module.exports = UserService
