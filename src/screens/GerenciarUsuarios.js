import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import {
  ScanCommand,
  PutItemCommand,
  DeleteItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import AsyncStorage from "@react-native-async-storage/async-storage";

import bcrypt from "bcryptjs";

import dynamoDB from "../../awsConfig";

const TABLENAME = "users";
const SALT_ROUNDS = 10;

export default function GerenciarUsuarios({ navigation }) {
  const [usuarios, setUsuarios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaOriginal, setSenhaOriginal] = useState("");
  const [tipo, setTipo] = useState("aluno");
  const [loading, setLoading] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(null);
  const [turmaProfessor, setTurmaProfessor] = useState("");
  const [cursoProfessor, setCursoProfessor] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  useEffect(() => {
    verificarPermissaoEcarregarUsuarios();
  }, []); // --- Funções de Permissão e Dados ---

  const verificarPermissaoEcarregarUsuarios = async () => {
    const usuarioLogadoString = await AsyncStorage.getItem("usuarioLogado");
    if (usuarioLogadoString) {
      const user = JSON.parse(usuarioLogadoString);
      setUsuarioLogado(user); // RESTRICÃO: Apenas Admin pode ver esta tela
      if (user.tipo !== "admin") {
        Alert.alert(
          "Acesso Negado",
          "Apenas administradores podem gerenciar usuários."
        );
        navigation.goBack();
        return;
      } // Se for admin, carrega os dados
      carregarUsuarios();
    } else {
      // Se não houver usuário logado, retorna ao login
      navigation.replace("Login");
    }
  };

  const limparCampos = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setSenhaOriginal("");
    setTipo("aluno");
    setModoEdicao(null);
    setTurmaProfessor("");
    setCursoProfessor("");
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const comando = new ScanCommand({ TableName: TABLENAME });
      const resultado = await dynamoDB.send(comando);
      const usuariosFormatados = resultado.Items.map((item) => ({
        id: item.id && item.id.N,
        nome: (item.nome && item.nome.S) || "",
        email: (item.email && item.email.S) || "",
        tipo: (item.tipo && item.tipo.S) || "indefinido",
        turmaProfessor: (item.turmaProfessor && item.turmaProfessor.S) || "",
        cursoProfessor: (item.cursoProfessor && item.cursoProfessor.S) || "",
        senha: "******",
      })).filter((user) => user.id);

      setUsuarios(usuariosFormatados);
    } catch (erro) {
      console.log("Erro ao carregar usuários:", erro);
      Alert.alert("Erro", "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  };

  const buscarSenhaAtual = async (id) => {
    try {
      const comando = new GetItemCommand({
        TableName: TABLENAME,
        Key: { id: { N: id } },
        ProjectionExpression: "senha",
      });
      const resultado = await dynamoDB.send(comando);
      return resultado.Item && resultado.Item.senha && resultado.Item.senha.S;
    } catch (error) {
      console.error("Erro ao buscar senha original:", error);
      return null;
    }
  };

  const criarUsuario = async () => {
    if (!nome || !email || (!senha && !modoEdicao) || !tipo) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios.");
      return;
    }

    if (tipo === "professor" && (!turmaProfessor || !cursoProfessor)) {
      Alert.alert(
        "Atenção",
        "Para o tipo Professor, a Turma e o Curso são obrigatórios."
      );
      return;
    }

    setLoading(true);
    let senhaParaSalvar = "";
    try {
      if (senha) {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        senhaParaSalvar = await bcrypt.hash(senha, salt);
      } else if (modoEdicao) {
        senhaParaSalvar = senhaOriginal;
      } else {
        Alert.alert("Erro de Senha", "Senha obrigatória para novo usuário.");
        setLoading(false);
        return;
      }
    } catch (hashError) {
      console.log("Erro ao hashear senha:", hashError);
      Alert.alert("Erro", "Não foi possível processar a senha.");
      setLoading(false);
      return;
    }

    const id = modoEdicao || Date.now().toString();
    const itemAtributos = {
      id: { N: id },
      nome: { S: nome },
      email: { S: email.toLowerCase() },
      senha: { S: senhaParaSalvar },
      tipo: { S: tipo },
    };

    if (tipo === "professor") {
      itemAtributos.turmaProfessor = { S: turmaProfessor };
      itemAtributos.cursoProfessor = { S: cursoProfessor };
    } else {
      itemAtributos.turmaProfessor = { S: "" };
      itemAtributos.cursoProfessor = { S: "" };
    }
    const comando = new PutItemCommand({
      TableName: TABLENAME,
      Item: itemAtributos,
    });

    try {
      await dynamoDB.send(comando);
      setModalVisible(false);
      limparCampos();
      carregarUsuarios();
      Alert.alert("Sucesso", "Usuário salvo com sucesso!");
    } catch (erro) {
      console.log("Erro ao salvar usuário:", erro);
      Alert.alert("Erro", "Não foi possível salvar o usuário.");
    } finally {
      setLoading(false);
    }
  };
  // ⭐ FUNÇÃO EXCLUIRUSUARIO (REINSERIDA)
  const excluirUsuario = (id) => {
    Alert.alert(
      "Confirmar exclusão",
      "Deseja realmente excluir este usuário?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          onPress: async () => {
            try {
              const comando = new DeleteItemCommand({
                TableName: TABLENAME,
                Key: { id: { N: id } },
              });
              await dynamoDB.send(comando);
              carregarUsuarios();
            } catch (erro) {
              console.log("Erro ao excluir usuário:", erro);
              Alert.alert("Erro", "Não foi possível excluir o usuário.");
            }
          },
        },
      ]
    );
  }; // --- Funções de manipulação da UI (CORRIGINDO REFERENCE ERROR) ---
  // FIM DE FUNÇÃO EXCLUIRUSUARIO

  const handleOpenModalToCreate = () => {
    limparCampos();
    setModalVisible(true);
  };

  const handleOpenModalToEdit = async (item) => {
    // Carrega os dados do item para o formulário
    setNome(item.nome);
    setEmail(item.email);
    setSenha("");
    setTipo(item.tipo);
    setModoEdicao(item.id);
    setTurmaProfessor(item.turmaProfessor);
    setCursoProfessor(item.cursoProfessor);
    setModalVisible(true);

    const hashOriginal = await buscarSenhaAtual(item.id);
    setSenhaOriginal(hashOriginal || "");
  };
  const handleConfirmAction = () => {
    criarUsuario();
  };

  // ... (renderUsuario e outras funções de UI mantidas)

  const renderUsuario = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => excluirUsuario(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => handleOpenModalToEdit(item)}
      >
        <Ionicons name="create-outline" size={20} color="white" />
      </TouchableOpacity>

      <Text style={styles.cardTitle}>{item.nome}</Text>
      <Text style={styles.cardSubtitle}>Email: {item.email}</Text>
      <Text style={styles.cardSubtitle}>Tipo: {item.tipo.toUpperCase()}</Text>
      {item.tipo === "professor" && (
        <>
          <Text style={styles.cardSubtitle}>Turma: {item.turmaProfessor}</Text>
          <Text style={styles.cardSubtitle}>Curso: {item.cursoProfessor}</Text>
        </>
      )}
      <Text style={styles.cardSubtitle}>ID: {item.id}</Text>
    </View>
  );

  // Se ainda estiver verificando a permissão, mostre um loading.
  if (!usuarioLogado || usuarioLogado.tipo !== "admin") {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={{ color: "#fff", marginTop: 10 }}>
          Verificando permissões...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleOpenModalToCreate}
      >
        <Ionicons name="add-circle" size={32} color="#fff" />
        <Text style={styles.addButtonText}>Criar Usuário</Text>
      </TouchableOpacity>

      {/* ... FlatList e Modal */}
      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id}
        renderItem={renderUsuario}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum usuário cadastrado.</Text>
        }
      />

      {/* Modal de criação/edição */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modoEdicao
                ? "Editar Usuário (ID: " + modoEdicao + ")"
                : "Novo Usuário"}
            </Text>

            {/* Input Nome, Email, Senha (Mantidos) */}
            <TextInput
              style={styles.input}
              placeholder="Nome Completo"
              placeholderTextColor="#777"
              value={nome}
              onChangeText={setNome}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#777"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder={
                modoEdicao ? "Nova Senha (deixe vazio para manter)" : "Senha"
              }
              placeholderTextColor="#777"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
              editable={!loading}
            />

            {/* Picker Tipo */}
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={tipo}
                style={styles.picker}
                onValueChange={(itemValue) => setTipo(itemValue)}
                dropdownIconColor="#0078D7"
                enabled={!loading}
              >
                <Picker.Item label="Aluno" value="aluno" />
                <Picker.Item label="Professor" value="professor" />
                <Picker.Item label="Admin" value="admin" />
              </Picker>
            </View>

            {/* ⭐ NOVOS CAMPOS PARA PROFESSOR (Visíveis apenas se tipo=professor) */}
            {tipo === "professor" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Turma do Professor (Ex: Turma A)"
                  placeholderTextColor="#777"
                  value={turmaProfessor}
                  onChangeText={setTurmaProfessor}
                  editable={!loading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Curso em que atua (Ex: Web Design)"
                  placeholderTextColor="#777"
                  value={cursoProfessor}
                  onChangeText={setCursoProfessor}
                  editable={!loading}
                />
              </>
            )}

            {/* Botões Cancelar / Salvar (Mantidos) */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  limparCampos();
                }}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmAction}
                disabled={loading}
              >
                <Text style={styles.confirmText}>
                  {loading
                    ? "Salvando..."
                    : modoEdicao
                    ? "Salvar Edição"
                    : "Criar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Estilos Mantidos do GerenciarTurmas.js ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101820FF",
    padding: 16,
  },
  emptyText: {
    color: "#ccc",
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#0078D7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 18,
    marginLeft: 8,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
    position: "relative",
  },
  cardTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "#ccc",
    fontSize: 14,
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#E74C3C",
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  editButton: {
    position: "absolute",
    top: 8,
    right: 50,
    backgroundColor: "#F39C12",
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "85%",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    color: "#333",
  },
  inputDisabled: {
    backgroundColor: "#e0e0e0", // Cor diferente para campo desabilitado
  },
  pickerContainer: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
    color: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: "#ccc",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: "#0078D7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelText: {
    color: "#333",
    fontWeight: "bold",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
