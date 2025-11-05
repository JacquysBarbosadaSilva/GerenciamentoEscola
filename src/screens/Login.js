import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dynamoDB from "../../awsConfig";
import { ScanCommand } from "@aws-sdk/client-dynamodb";
import bcrypt from "bcryptjs";

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
    <SafeAreaView style={styles.container}>
      <Image source={require("../assets/lyraback.png")} style={styles.logo} />
      <Text style={styles.title}>Bem-vindo ao Lyra</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#bbb"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#bbb"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={fazerLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#0a1e3f" /> : <Text style={styles.buttonText}>Entrar</Text>}
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Esqueceu a senha?{" "}
        <Text style={styles.link} onPress={() => navigation.navigate("RedefinirSenha")}>
          Clique aqui
        </Text>
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#63b8ff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#11274d",
    marginBottom: 40,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#11274d",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    color: "#fff",
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#F2BE5B",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#0a1e3f",
    fontSize: 18,
    fontWeight: "bold",
  },
  footerText: {
    marginTop: 20,
    color: "#11274d",
  },
  link: {
    color: "#11274d",
    textDecorationLine: "underline",
    fontWeight: "bold",
  },
});
