import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Image, 
  ActivityIndicator 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dynamoDB from "../../awsConfig";
import { ScanCommand } from "@aws-sdk/client-dynamodb";
import bcrypt from "bcryptjs";

// import Icon from 'react-native-vector-icons/Feather'; // Caso queira usar ícones

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
        {/* Logo ou imagem */}
        <Image 
          source={require("../assets/lyraback.png")} 
          style={styles.logo} 
        />

        <Text style={styles.title}>Bem-vindo</Text>
        <Text style={styles.subtitle}>Faça login na sua conta Lyra</Text>

        {/* Campo de Email */}
        <View style={styles.inputContainer}>
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

        {/* Rodapé / Link */}
        <Text style={styles.footerText}>
          Esqueceu a senha?{" "}
          <Text 
            style={styles.link} 
            onPress={() => navigation.navigate("RedefinirSenha")}
          >
            Clique aqui
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: "#11274d",
    justifyContent: "center",
    alignItems: "center",
  },

  loginCard: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },

  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    borderRadius: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#11274d",
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 30,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 50,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    marginBottom: 15,
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 15,
    color: "#11274d",
  },

  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#63b8ff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  footerText: {
    marginTop: 25,
    color: "#666",
    fontSize: 14,
  },

  link: {
    color: "#F2BE5B",
    textDecorationLine: "none",
    fontWeight: "bold",
  },
});
