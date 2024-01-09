import { ModelStatic } from "sequelize"
import { Sequelize } from "sequelize-typescript"

import { ReviewComment } from "@database/models/ReviewComment"
import { Reviewer } from "@database/models/Reviewers"
import { ReviewMeta } from "@database/models/ReviewMeta"
import { ReviewRequest } from "@database/models/ReviewRequest"
import { User } from "@database/models/User"

export default class ReviewCommentService {
  private readonly repository: ModelStatic<ReviewComment>

  constructor(repository: ModelStatic<ReviewComment>) {
    this.repository = repository
  }

  getCommentsForReviewRequest(reviewId: number) {
    return this.repository.findAll({
      where: { reviewId },
      include: [{ model: User, required: true }],
    })
  }

  createCommentForReviewRequest(
    reviewId: number,
    userId: string,
    comment: string
  ) {
    return this.repository.create({
      reviewId,
      reviewerId: userId,
      comment,
    })
  }
}
