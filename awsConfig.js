import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const AWS_ACCESS_KEY_ID = "ASIAZYPPXAY4RI26AD5P";
const AWS_SECRET_ACCESS_KEY = "vTaLPPYPr+IyJSsgnHYUP9FZj38+5z3ijhc7Ph0e";
const AWS_SESSION_TOKEN = "IQoJb3JpZ2luX2VjEMj//////////wEaCXVzLXdlc3QtMiJIMEYCIQDB0+jlLpzpNVzGLJ6BP3iaMHgXkfbffLUkovmyBjwhDAIhAOjRjpBokPfeUH+5chywckKVQnSnDuDBbg+vT8/+Euy7KsECCJH//////////wEQABoMNjcxMDU0NDk3MzM3Igz/V1E6D+gKQ/ZWx+wqlQJNYx3t/ieJYzvPopZs2Py2s07cZ10a+VBNgQtVP5CYjrlNz5HEWch0K7L1CLPKcik12bfviYp5WZq6bCyoUk34vMkUMhSoz7pUYHJBWLekG0HJqU3FZeI2inwVYod156j4tvLjY7iCOmLAi4/QVb828PKQrTFjXbcCT5HMOHPjXEY5YiQEEn0y60e3otGRpG1ktij3qd4vZCaYeVaZNAV/K0ngKZG7XdHK5SGZDxEk+JMwVZJxVO74uLOQvzapj3y9MmSjtVsCKYinz2cSAoq9rEVZTQDH7OCCp7PsAYTkHvRiDN62fGb34A99o3wlr6y+EXXJd1yHyAhDKd3eBYUnNXuvoiYbtcMvl3Q9WvqS0/a9zRsoMJjtrcgGOpwBB8SbDdhLrSuaOG2WCX1uZvhf0wDwJLy8hT9FNYUlSwTIWiqfYUYVkfk6DWvQ50DRCiY7AV4T8x/LcWvFOJxSa8xwJuzDGj3sO9DLfxnvfMgh30j3ZMhTJJ0YCXQBC4ibm1cnN4eWyY9lZYS8pdEXn46QxdAtAqcDxamCgH6r+nyJaKsLX1tJaIqaBVQbW9YkhzdxiIGr9IZVkxj2";

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