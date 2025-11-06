import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform, // Para ajustes de sombra
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons"; // Ícones nos botões

export default function Home({ navigation }) {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loading, setLoading] = useState(true);

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case "admin":
        return "Administrador";
      case "professor":
        return "Professor(a)";
      default:
        return "Aluno(a)";
    }
  };

  // Garante que o estado do usuário seja verificado sempre que a Home for acessada
  useFocusEffect(
    React.useCallback(() => {
      const carregarUsuario = async () => {
        setLoading(true);
        const usuarioLogadoString = await AsyncStorage.getItem("usuarioLogado");
        if (usuarioLogadoString) {
          const user = JSON.parse(usuarioLogadoString);
          setUsuarioLogado(user);
        } else {
          // Se não houver usuário logado, retorna ao login
          navigation.replace("Login");
        }
        setLoading(false);
      };

      carregarUsuario();
    }, [])
  );

  if (loading || !usuarioLogado) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Carregando dados de usuário...</Text>
      </View>
    );
  }

  // Desestrutura o tipo para facilitar o acesso
  const { nome, tipo } = usuarioLogado;
  const tipoLabel = getTipoLabel(tipo);

  // Componente de Botão Centralizado
  const MenuButton = ({ icon, text, screenName, isSpecial = false }) => (
    <TouchableOpacity
      style={[styles.button, isSpecial && styles.specialButton]}
      onPress={() => navigation.navigate("Drawer", { screen: screenName })}
    >
      <Ionicons name={icon} size={24} color="#fff" style={styles.buttonIcon} />
      <Text style={styles.buttonText}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá,</Text>
        <Text style={styles.title}>{nome.split(" ")[0]}</Text>
        <Text style={styles.subtitle}>Perfil: {tipoLabel}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        {/* Botão de Gerenciar Turmas (Visível para Admin e Professor) */}
        {(tipo === "admin" || tipo === "professor") && (
          <MenuButton
            icon="people"
            text="Gerenciar Turmas"
            screenName="Gerenciar Turmas"
          />
        )}

        {/* ⭐ Botão de Gerenciar Usuários (Visível APENAS para Admin) */}
        {tipo === "admin" && (
          <MenuButton
            icon="settings"
            text="Gerenciar Usuários"
            screenName="Gerenciar Usuários"
            isSpecial={true}
          />
        )}

        {/* Botão de Gerenciar Aulas (Visível para todos) */}
        <MenuButton
          icon={tipo === "aluno" ? "school" : "book"}
          text={
            tipo === "aluno"
              ? "Minhas Aulas"
              : "Gerenciar Aulas/Atividades"
          }
          screenName="Gerenciar Aulas"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#11274d",
    padding: 20,
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 10,
    color: "#3B82F6",
  },
  header: {
    width: "100%",
    marginBottom: 50,
    alignItems: "center",
  },
  greeting: {
    fontSize: 24,
    color: "#3B82F6",
    fontWeight: "500",
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#ecedefff",
    marginTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    width: "60%",
    textAlign: "center",
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
  },
  button: {
    backgroundColor: "#5e6785ff",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginVertical: 10,
    width: "95%",
    maxWidth: 450,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  specialButton: {
    backgroundColor: "#5e6785ff",
  },
  buttonIcon: {
    marginRight: 15,
  },
  buttonText: {
    color: "#11274d",
    fontSize: 18,
    fontWeight: "700",
  },
});
