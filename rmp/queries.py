"""GraphQL operations used against RateMyProfessors' public endpoint."""

TEACHER_PROFILE_QUERY = """
query TeacherRatingsPageQuery($id: ID!) {
  node(id: $id) {
    __typename
    ... on Teacher {
      id
      legacyId
      firstName
      lastName
      department
      avgRating
      avgDifficulty
      numRatings
      wouldTakeAgainPercent
      school {
        id
        legacyId
        name
        city
        state
      }
      teacherRatingTags {
        id
        legacyId
        tagName
        tagCount
      }
      courseCodes {
        courseName
        courseCount
      }
    }
  }
}
"""

RATINGS_LIST_QUERY = """
query RatingsListQuery(
  $count: Int!
  $id: ID!
  $courseFilter: String
  $cursor: String
) {
  node(id: $id) {
    __typename
    ... on Teacher {
      id
      ratings(first: $count, after: $cursor, courseFilter: $courseFilter) {
        edges {
          node {
            id
            legacyId
            comment
            date
            class
            helpfulRating
            clarityRating
            difficultyRating
            ratingTags
            flagStatus
            attendanceMandatory
            wouldTakeAgain
            grade
            textbookUse
            isForOnlineClass
            isForCredit
            thumbsUpTotal
            thumbsDownTotal
            teacherNote {
              comment
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
"""
