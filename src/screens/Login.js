import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dynamoDB from "../../awsConfig";
import { ScanCommand } from "@aws-sdk/client-dynamodb";
import bcrypt from "bcryptjs";

// Importe se tiver ícones (ex: 'react-native-vector-icons/Feather')
// import Icon from 'react-native-vector-icons/Feather';

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const fazerLogin = async () => {
    if (!email || !senha) {
      Alert.alert("Erro", "Preencha todos os campos!");
      return;
    }

    setLoading(true);

    try {
      // 🔍 Busca o usuário pelo email no DynamoDB
      const data = await dynamoDB.send(
        new ScanCommand({
          TableName: "users",
          FilterExpression: "email = :email",
          ExpressionAttributeValues: {
            ":email": { S: email },
          },
        })
      );

      if (!data.Items || data.Items.length === 0) {
        Alert.alert("Erro", "Usuário não encontrado!");
        setLoading(false);
        return;
      }

      const usuario = data.Items[0];
      const senhaHash = usuario.senha.S;

      // 🔐 Compara a senha digitada com o hash salvo
      const senhaCorreta = await bcrypt.compare(senha, senhaHash);

      if (!senhaCorreta) {
        Alert.alert("Erro", "Senha incorreta!");
        setLoading(false);
        return;
      }

      // ✅ Login bem-sucedido
      const tipoUsuario = usuario.tipo.S;

      // 💾 Armazena informações do usuário logado
      await AsyncStorage.setItem(
        "usuarioLogado",
        JSON.stringify({
          id: usuario.id.S,
          nome: usuario.nome.S,
          email: usuario.email.S,
          tipo: tipoUsuario,
        })
      );

      await AsyncStorage.setItem("usuarioId", usuario.id.N);

      Alert.alert("Sucesso", `Bem-vindo, ${usuario.nome.S}!`);

      if (tipoUsuario === "admin") {
        navigation.navigate("Home"); // Tela de admin
      } else {
        navigation.navigate("Home"); // Tela de funcionário
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      Alert.alert("Erro", "Falha na autenticação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.fullContainer}>
      <View style={styles.loginCard}>
        {/* Adicione a imagem ou logo se necessário, ou mantenha a original fora do card */}
        <Image 
          source={require("../assets/lyraback.png")} // Ajuste o caminho se necessário
          style={styles.logo} 
        />
        <Text style={styles.title}>Bem-vindo</Text>
        <Text style={styles.subtitle}>Faça login na sua conta Lyra</Text>

        {/* Campo de Email */}
        <View style={styles.inputContainer}>
          {/* Onde um Ícone iria, se fosse usar. Mantenha o estilo para alinhamento. */}
          {/* <Icon name="mail" size={20} color="#888" style={styles.icon} /> */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Campo de Senha */}
        <View style={styles.inputContainer}>
          {/* <Icon name="lock" size={20} color="#888" style={styles.icon} /> */}
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#888"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />
        </View>

        {/* Botão de Login */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={fazerLogin} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        {/* Texto de Rodapé / Link */}
        <Text style={styles.footerText}>
          Esqueceu a senha?{" "}
          <Text style={styles.link} onPress={() => navigation.navigate("RedefinirSenha")}>
            Clique aqui
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Fundo da Tela
  fullContainer: {
    flex: 1,
    backgroundColor: "#11274d", // Azul escuro mais institucional
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Card de Login
  loginCard: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#fff", // Fundo branco para destaque
    borderRadius: 20, // Bordas mais arredondadas
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8, // Sombra para Android
  },
  
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
    // Estilo para deixar a logo circular ou com borda
    borderRadius: 15, 
    // Outras propriedades como sombra podem ser adicionadas aqui
  },
  
  title: {
    fontSize: 26,
    fontWeight: "800", // Mais negrito
    color: "#11274d", 
    marginBottom: 5,
  },
  
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 30,
  },

  // Container para Input (se for usar ícones, ajuda no layout)
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: "100%",
    height: 50,
    backgroundColor: "#f0f0f0", // Fundo mais claro para o input
    borderRadius: 12,
    marginBottom: 15,
    // paddingHorizontal: 15, // Removido para dar espaço ao ícone
  },

  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15, // Ajustado para dar espaço visual
    color: "#11274d",
  },

  // Botão Principal
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#63b8ff", // Novo azul vibrante
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    // Sombra sutil
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  buttonText: {
    color: "#fff", // Texto branco para contraste
    fontSize: 18,
    fontWeight: "bold",
  },
  
  // Rodapé e Link
  footerText: {
    marginTop: 25,
    color: "#666",
    fontSize: 14,
  },
  
  link: {
    color: "#F2BE5B", // Cor de destaque para o link (Laranja/Amarelo)
    textDecorationLine: "none", // Tirando o sublinhado para um visual mais limpo, mas pode manter
    fontWeight: "bold",
  },
});