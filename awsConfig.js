import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const AWS_ACCESS_KEY_ID = "ASIAZYPPXAY4WMSIA6Z5";
const AWS_SECRET_ACCESS_KEY = "3rVMdyoDI3eEoy/Qrw5QUppNcRC5ot0e8jf4ity3";
const AWS_SESSION_TOKEN = "IQoJb3JpZ2luX2VjENv//////////wEaCXVzLXdlc3QtMiJGMEQCIH0poaBEthkzrI3HAHtjrnxWVwwfMF2OJ8NpaaVMUaW1AiBA+AN5eGf/2IeHqABf/02xE7Q2ecUwP5dH2B2Fi6O8VyrBAgik//////////8BEAAaDDY3MTA1NDQ5NzMzNyIMuKOEkVRet9SmKipPKpUCXlkjeWh7fDipcQ1AI5+123oGTeBZ/lVNHn16wWgGN5o46KYkGyFvRNViBIEOjzmYjybM2R+zB9MmcDjFU6wsSHPgSKYDSxXsTm8ADIUCF6jJ9v9n18e6RghCVMgvn7O6nBXSWrcLHn0vMa2jExxq10qHkox5WLUBwJ5mVAjK/fcFR0k9eg/Z1QMlECfR4rNiHYlRE4L+BqFHRNKqB9Td96hOshSjyRL1vZH7t+itoeo0gWoXYKB82ay+kjfDTXrqUWhwgC1doCch//8gRcGZUY7dHMb1N9c1s2GyhoVSEt/0mMK4g62mGQNl4OYYu6nTbandiJ1fSZc0axPUydgVqbh+L5tQHVZCK+ev3L3CXViUMjKBujCzh7LIBjqeARnYRPGawUmVTXiJ23oWDV53Jv16QVHkm4/YsZit+xJ6qs4ZoHI07HLRMWiRtgGYIbYtey4hFXE75sqzmqCPw5FiIUUAfqdQ1WTDYAvvu7OZgYFp07NB99Iiy6th0M4UhQ+gAUu5J5e5aA4rwbX2nqn5Z7prd6b+lOcl71ktJmuaF/Ld1wxOwedOkpCZfb3wWZebICjm0nk5OYBmXUwU";

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