Para o funcionamento do aplicativo, é necessário, primeiramente, acessar a raiz do projeto e instalar todas as dependências com o comando npm install. Após a instalação, deve-se configurar o arquivo awsConfig.js com as credenciais obtidas no AWS Academy, substituindo as chaves de acesso (accessKeyId, secretAccessKey e sessionToken) para que o app possa se conectar corretamente ao serviço do DynamoDB. É importante lembrar que essas credenciais expiram periodicamente, sendo necessário atualizá-las sempre que isso ocorrer.

Além disso, é indispensável criar três tabelas no DynamoDB para o correto funcionamento do aplicativo: users, turmas e atividades. Todas as tabelas devem conter uma Partition Key chamada id, com o tipo definido como N (Number). Cada tabela tem sua função específica dentro do sistema: a tabela users armazena os dados de login e tipo de usuário (professor ou administrador), a tabela turmas guarda as informações das turmas e seus respectivos professores e alunos, e a tabela atividades relaciona as atividades cadastradas às turmas correspondentes.

Com essas configurações concluídas, o aplicativo estará pronto para ser executado e utilizado normalmente, permitindo o gerenciamento eficiente das informações escolares de forma integrada com a nuvem da AWS.

Login:
-Para testes de admin use:
    teste@gmail.com
    1234

-Para testes de professor:
    testeprof@gmail.com
    1234