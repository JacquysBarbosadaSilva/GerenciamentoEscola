import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const AWS_ACCESS_KEY_ID = "ASIAZYPPXAY4YP3VJ2LL";
const AWS_SECRET_ACCESS_KEY = "Ej/moMHu+P7iPpsQ22KUx17vUo0vblCqBszpzEux";
const AWS_SESSION_TOKEN = "IQoJb3JpZ2luX2VjELn//////////wEaCXVzLXdlc3QtMiJGMEQCIFDhrU+afyWhzb3lPFlRcXPrgm9gEyk4oFFoCcxofhaMAiBd7Qyw+TscbBpacGOdhJ9HXcyXkXun1NLMu9asjLB8NirBAgiC//////////8BEAAaDDY3MTA1NDQ5NzMzNyIM4dkYreYRvxpYJAPkKpUC+ko7LI0rXae/Tgth1KOOMi4fjS+JUMQjcNNnjaWMvYRYyPSistsZzJ6iC9vR4sV0kg5w3JLlxeyWBj+wc9nZVHPjgLwqdFf7nQxKCG7yXYS/W4bppk2Em6KpCgu15osOz9EGU0GDpL8o+JVKogB/IXZ9nnq9l5QCXm7+gfS2B2cf8t8tZSc9cz2Gl6Lwp4y26qna9wRK4P7ooDNrj3NKmPEH66AssfGr4WswVWcU1mdtXchoNcsTtahTaz6QMrICQ5zParGwUGnkr2K9nQ5HAxH099FNjenG+G+jh0dq41JZKYGSiBorjmKP3iUELzFCJSCYX8DWfOk1si7+jrZOzqDlXR4Oz58l9Gljp+tU8d1oQ5H08zDisqrIBjqeAbbL0Nv9B48EcRu2NAkS//cTkgDUu9nCT0oqduhkEnnnWHGzaTkvnf5K9j7mvL/B3LRimU5YKgY9IWnrcRYneCpU1jNx2RJIfnxH01tnmk+ENhUq7cNxJj530v4NCervTAeDie0VFTtdWRQtTj32f6Q9nKGBt3LS6IggkicycAmLPvHnrq6GomjlF0YtXZ9RGtWGOX/HSqdgHxYT0E3u";

// Região da AWS (ajuste se for diferente)
const REGION = "us-east-1";


// Configuração do DynamoDB
export const dynamoDB = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    sessionToken: AWS_SESSION_TOKEN, // apenas se estiver usando credenciais temporárias
  },
});

export default dynamoDB;