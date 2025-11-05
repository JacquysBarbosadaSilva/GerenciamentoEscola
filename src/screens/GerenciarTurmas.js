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

export default function GerenciarTurmas() {
  const navigation = useNavigation();
  const [turmas, setTurmas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nomeTurma, setNomeTurma] = useState("");
  const [professor, setProfessor] = useState("");
  const [alunos, setAlunos] = useState("");
  const [loading, setLoading] = useState(false);
  const [editandoTurma, setEditandoTurma] = useState(null); // 👈 novo estado

  useEffect(() => {
    carregarTurmas();
  }, []);

  const carregarTurmas = async () => {
    try {
      const usuarioString = await AsyncStorage.getItem("usuarioLogado");
      const usuario = JSON.parse(usuarioString);
      const professorNome = usuario?.nome;
      const isAdmin = usuario?.tipo === "admin"; // ✅ verificar se é admin

      const comando = new ScanCommand({ TableName: "turmas" });
      const resultado = await dynamoDB.send(comando); // ✅ usa dynamoDB, não client

      const turmasFormatadas = resultado.Items.map((item) => ({
        id: item.id.N,
        nome: item.nome.S,
        professor: item.professor.S,
        alunos: item.alunos ? item.alunos.S.split(",") : [],
      }));

      // ✅ Admin vê todas as turmas
      const minhasTurmas = isAdmin
        ? turmasFormatadas
        : turmasFormatadas.filter((t) => t.professor === professorNome);

      setTurmas(minhasTurmas);
    } catch (erro) {
      console.log("Erro ao carregar turmas:", erro);
      Alert.alert("Erro", "Não foi possível carregar as turmas.");
    }
  };

  // 👇 Função para abrir o modal de edição
  const abrirModalEdicao = (turma) => {
    setEditandoTurma(turma);
    setNomeTurma(turma.nome);
    setProfessor(turma.professor);
    setAlunos(turma.alunos.join(", "));
    setModalVisible(true);
  };

  // 👇 Criar ou editar turma
  const salvarTurma = async () => {
    if (!nomeTurma) {
      Alert.alert("Atenção", "Informe o nome da turma.");
      return;
    }

    setLoading(true);

    try {
      const usuarioString = await AsyncStorage.getItem("usuarioLogado");
      const usuario = JSON.parse(usuarioString);
      const professorNome = usuario?.nome || "Desconhecido";

      const id = editandoTurma ? editandoTurma.id : Date.now().toString();

      const comando = new PutItemCommand({
        TableName: "turmas",
        Item: {
          id: { N: id },
          nome: { S: nomeTurma },
          professor: { S: professorNome },
          alunos: { S: alunos },
        },
      });

      await dynamoDB.send(comando);
      setModalVisible(false);
      setNomeTurma("");
      setAlunos("");
      setEditandoTurma(null);
      carregarTurmas();
    } catch (erro) {
      console.log("Erro ao salvar turma:", erro);
      Alert.alert("Erro", "Não foi possível salvar a turma.");
    } finally {
      setLoading(false);
    }
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
        {/* 👇 Ícone de EDIÇÃO no lugar do "olho" */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => abrirModalEdicao(item)}
        >
          <Ionicons name="create-outline" size={20} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => excluirTurma(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditandoTurma(null);
          setNomeTurma("");
          setProfessor("");
          setAlunos("");
          setModalVisible(true);
        }}
      >
        <Ionicons name="add-circle" size={32} color="#fff" />
        <Text style={styles.addButtonText}>Criar Turma</Text>
      </TouchableOpacity>

      <FlatList
        data={turmas}
        keyExtractor={(item) => item.id}
        renderItem={renderTurma}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Modal de Criação / Edição */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editandoTurma ? "Editar Turma" : "Nova Turma"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome da Turma"
              value={nomeTurma}
              onChangeText={setNomeTurma}
            />
            <TextInput
              style={styles.input}
              placeholder="Professor Responsável"
              value={professor}
              onChangeText={setProfessor}
              editable={!editandoTurma} // 👈 bloqueia edição do professor
            />
            <TextInput
              style={styles.input}
              placeholder="Alunos (separe por vírgulas)"
              value={alunos}
              onChangeText={setAlunos}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={salvarTurma}
                disabled={loading}
              >
                <Text style={styles.confirmText}>
                  {loading ? "Salvando..." : "Salvar"}
                </Text>
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
    backgroundColor: "#101820FF",
    padding: 16,
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
  cardButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  editButton: {
    backgroundColor: "#0078D7",
    borderRadius: 20,
    padding: 8,
    marginRight: 10,
  },
  deleteButton: {
    backgroundColor: "#E74C3C",
    borderRadius: 20,
    padding: 8,
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
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
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
