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
import {
  ScanCommand,
  PutItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import dynamoDB from "../../awsConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

// 🎨 Paleta de cores padronizada
const COLORS = {
  background: "#11274d",
  primary: "#63b8ff",
  secondary: "#fff",
  text: "#11274d",
  textSecondary: "#333",
  danger: "#E74C3C",
  inputBackground: "#3A3A3A",
  modalBackground: "#2C2C2C",
  gray: "#777",
};

export default function GerenciarTurmas() {
  const navigation = useNavigation();
  const [turmas, setTurmas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nomeTurma, setNomeTurma] = useState("");
  const [professor, setProfessor] = useState("");
  const [alunos, setAlunos] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [editandoTurma, setEditandoTurma] = useState(null);
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  useEffect(() => {
    const setup = async () => {
      await buscarDadosUsuario();
      carregarTurmas();
    };
    setup();
  }, []);

  const buscarDadosUsuario = async () => {
    try {
      const usuarioString = await AsyncStorage.getItem("usuarioLogado");
      if (usuarioString) {
        setUsuarioLogado(JSON.parse(usuarioString));
      }
    } catch (error) {
      console.log("Erro ao buscar usuário logado:", error);
    }
  };

  const carregarTurmas = async () => {
    setLoadingTurmas(true);
    try {
      const usuarioString = await AsyncStorage.getItem("usuarioLogado");
      const usuario = JSON.parse(usuarioString);
      const professorNome = usuario?.nome;
      const isAdmin = usuario?.tipo === "admin";

      const comando = new ScanCommand({ TableName: "turmas" });
      const resultado = await dynamoDB.send(comando);

      const turmasFormatadas = resultado.Items.map((item) => ({
        id: item.id.N,
        nome: item.nome.S,
        professor: item.professor.S,
        alunos: item.alunos
          ? item.alunos.S.split(",")
              .map((a) => a.trim())
              .filter((a) => a.length > 0)
          : [],
      }));

      const minhasTurmas = isAdmin
        ? turmasFormatadas
        : turmasFormatadas.filter((t) => t.professor === professorNome);

      setTurmas(minhasTurmas);
    } catch (erro) {
      console.log("Erro ao carregar turmas:", erro);
      Alert.alert("Erro", "Não foi possível carregar as turmas.");
    } finally {
      setLoadingTurmas(false);
    }
  };

  const abrirModalEdicao = (turma) => {
    setEditandoTurma(turma);
    setNomeTurma(turma.nome);
    setProfessor(turma.professor);
    setAlunos(turma.alunos.join(", "));
    setModalVisible(true);
  };

  const abrirModalCriacao = () => {
    setEditandoTurma(null);
    setNomeTurma("");
    setAlunos("");

    if (usuarioLogado?.tipo !== "admin") {
      setProfessor(usuarioLogado?.nome || "");
    } else {
      setProfessor("");
    }

    setModalVisible(true);
  };

  const salvarTurma = async () => {
    if (!nomeTurma || (usuarioLogado?.tipo === "admin" && !professor)) {
      Alert.alert("Atenção", "Preencha o nome da turma e o professor.");
      return;
    }

    setLoading(true);
    try {
      const profParaSalvar = editandoTurma
        ? editandoTurma.professor
        : usuarioLogado?.tipo !== "admin"
        ? usuarioLogado?.nome
        : professor;

      if (!profParaSalvar) {
        Alert.alert("Erro", "Não foi possível identificar o professor.");
        setLoading(false);
        return;
      }

      const id = editandoTurma ? editandoTurma.id : Date.now().toString();

      const comando = new PutItemCommand({
        TableName: "turmas",
        Item: {
          id: { N: id },
          nome: { S: nomeTurma },
          professor: { S: profParaSalvar },
          alunos: { S: alunos.trim() },
        },
      });

      await dynamoDB.send(comando);
      fecharModal();
      carregarTurmas();
    } catch (erro) {
      console.log("Erro ao salvar turma:", erro);
      Alert.alert("Erro", "Não foi possível salvar a turma.");
    } finally {
      setLoading(false);
    }
  };

  const fecharModal = () => {
    setModalVisible(false);
    setNomeTurma("");
    setProfessor("");
    setAlunos("");
    setEditandoTurma(null);
  };

  const excluirTurma = async (id) => {
    Alert.alert("Confirmar exclusão", "Deseja realmente excluir esta turma?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        onPress: async () => {
          try {
            const comandoVerificar = new ScanCommand({
              TableName: "atividades",
              FilterExpression: "turmaId = :id",
              ExpressionAttributeValues: {
                ":id": { N: id },
              },
            });

            const resultado = await dynamoDB.send(comandoVerificar);

            if (resultado.Items.length > 0) {
              Alert.alert(
                "Aviso",
                "Você não pode excluir uma turma com atividades cadastradas."
              );
              return;
            }

            const comandoExcluir = new DeleteItemCommand({
              TableName: "turmas",
              Key: { id: { N: id } },
            });

            await dynamoDB.send(comandoExcluir);
            carregarTurmas();
          } catch (erro) {
            console.log("Erro ao excluir turma:", erro);
            Alert.alert("Erro", "Não foi possível excluir a turma.");
          }
        },
      },
    ]);
  };

  const renderTurma = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.nome}</Text>
      <Text style={styles.cardSubtitle}>Professor: {item.professor}</Text>
      <Text style={styles.cardSubtitle}>
        Alunos:{" "}
        {item.alunos.length > 0
          ? item.alunos.join(", ")
          : "Nenhum aluno registrado"}
      </Text>

      <View style={styles.cardButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => abrirModalEdicao(item)}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => excluirTurma(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loadingTurmas) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando turmas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={abrirModalCriacao}>
        <Ionicons name="add-circle" size={24} color={COLORS.text} />
        <Text style={styles.addButtonText}>Criar Nova Turma</Text>
      </TouchableOpacity>

      <FlatList
        data={turmas}
        keyExtractor={(item) => item.id}
        renderItem={renderTurma}
        ListEmptyComponent={() => (
          <Text style={styles.emptyListText}>Nenhuma turma encontrada.</Text>
        )}
        contentContainerStyle={styles.flatListContent}
      />

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editandoTurma ? "Editar Turma" : "Nova Turma"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome da Turma (Ex: 1° Ano - Manhã)"
              placeholderTextColor={COLORS.textSecondary}
              value={nomeTurma}
              onChangeText={setNomeTurma}
            />

            <TextInput
              style={[
                styles.input,
                (editandoTurma || usuarioLogado?.tipo !== "admin") &&
                  styles.disabledInput,
              ]}
              placeholder={
                editandoTurma
                  ? `Professor: ${editandoTurma.professor}`
                  : "Professor Responsável (Apenas Admin preenche)"
              }
              placeholderTextColor={COLORS.textSecondary}
              value={editandoTurma ? editandoTurma.professor : professor}
              onChangeText={setProfessor}
              editable={!editandoTurma && usuarioLogado?.tipo === "admin"}
            />

            <TextInput
              style={styles.input}
              placeholder="Alunos (separe os nomes por vírgulas)"
              placeholderTextColor={COLORS.textSecondary}
              value={alunos}
              onChangeText={setAlunos}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={fecharModal}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={salvarTurma}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <Text style={styles.confirmText}>
                    {editandoTurma ? "Atualizar" : "Salvar"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.primary,
    marginTop: 10,
    fontSize: 16,
  },
  flatListContent: {
    paddingBottom: 100,
  },
  emptyListText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 6,
  },
  addButtonText: {
    color: COLORS.text,
    fontSize: 18,
    marginLeft: 10,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    borderColor: "#333",
    borderWidth: 1,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    color: COLORS.text,
    fontWeight: "900",
    marginBottom: 6,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 20,
  },
  cardButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    padding: 10,
    marginRight: 12,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 25,
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.modalBackground,
    width: "90%",
    borderRadius: 16,
    padding: 25,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    backgroundColor: COLORS.inputBackground,
    color: COLORS.text,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: "#4A4A4A",
    color: COLORS.textSecondary,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  cancelButton: {
    backgroundColor: COLORS.gray,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  cancelText: {
    color: COLORS.text,
    fontWeight: "bold",
    fontSize: 16,
  },
  confirmText: {
    color: COLORS.text,
    fontWeight: "bold",
    fontSize: 16,
  },
});
