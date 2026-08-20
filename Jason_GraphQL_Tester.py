"""
 From my Own Branch how to push to main:
 git push --set-upstream origin jason

 git status -> check if any commits unpushed 

 Go to Main:
 git checkout main

 Then Pull in main
 git pull origin main -> pulling from other branches

 Then Go back to your branch:
 git checkout jason

 Merge with Main 
 git merge main

"""

import requests
import base64


RMP_GRAPHGL_URL = "https://www.ratemyprofessors.com/graphql"

HEADERS = {
    "Authorization": "Basic dGVzdDp0ZXN0",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}
def encode_school_id(school_id:int) -> str:
    return base64.b64encode(f"School-{school_id}".encode()).decode()

SEARCH_PROFESSORS_QUERY = """
query NewSearchTeachersQuery($text: String!, $schoolID: ID!) {
  newSearch {
    teachers(query: {text: $text, schoolID: $schoolID}) {
      edges {
        node {
          id
          firstName
          lastName
          department
          avgRating
          avgDifficulty
          numRatings
          wouldTakeAgainPercent
        }
      }
    }
  }
}
"""

def search_professors(name: str, school_id:int):
    variables = {
        "text":name,
        "schoolID": encode_school_id(school_id)
    }
    response = requests.post(
        RMP_GRAPHGL_URL, 
        headers=HEADERS, 
        json={"query":SEARCH_PROFESSORS_QUERY, "variables": variables}
    )
    response.raise_for_status()
    return response.json()
if __name__ == "__main__":
    data = search_professors("",18846)
    print(data)