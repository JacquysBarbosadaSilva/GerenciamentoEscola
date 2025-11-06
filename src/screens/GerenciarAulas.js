import React, { useState, useEffect, useCallback } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import dynamoDB from "../../awsConfig";

const TURMAS_TABLENAME = "turmas";
const ATIVIDADES_TABLENAME = "atividades";

const formatNumero = (index) => String(index + 1).padStart(2, "0");

export default function GerenciarAulas({ navigation }) {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loading, setLoading] = useState(true);

  const [turmas, setTurmas] = useState([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);

  const [atividades, setAtividades] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [modoEdicao, setModoEdicao] = useState(null);

  const podeGerenciar =
    usuarioLogado?.tipo === "admin" || usuarioLogado?.tipo === "professor";



  const carregarDadosEFiltrarTurmas = useCallback(async () => {
    setLoading(true);

    try {
      const usuarioLogadoString = await AsyncStorage.getItem("usuarioLogado");
      if (!usuarioLogadoString) {
        Alert.alert("Erro de Sessão", "Usuário não logado. Redirecionando.");
        navigation.replace("Login");
        return;
      }

      const user = JSON.parse(usuarioLogadoString);
      setUsuarioLogado(user);

      // 🔍 Busca o registro completo do usuário logado no DynamoDB
      const comandoUser = new ScanCommand({
        TableName: "users",
        FilterExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": { S: user.email },
        },
      });

      const resultadoUser = await dynamoDB.send(comandoUser);

      if (!resultadoUser.Items || resultadoUser.Items.length === 0) {
        Alert.alert("Erro", "Usuário não encontrado no banco.");
        return;
      }

      const usuarioBanco = resultadoUser.Items[0];
      const tipoUsuario = usuarioBanco.tipo?.S || "professor";

      // 🧩 Lógica: Admin → todas as turmas / Professor → apenas a turma dele
      if (tipoUsuario === "admin") {
        // 🔹 Admin: busca todas as turmas
        const comandoTurmas = new ScanCommand({
          TableName: "turmas",
        });

        const resultadoTurmas = await dynamoDB.send(comandoTurmas);
        const turmasConvertidas = resultadoTurmas.Items.map((item) => ({
          id: item.id.N,
          nome: item.nome.S,
          professorNome: item.professor?.S || "Sem professor",
          alunos: item.alunos?.S || "",
        }));

        setTurmas(turmasConvertidas);
        setTurmaSelecionada(null); // admin escolhe depois
      } else {
        // 👨‍🏫 Professor: usa apenas a turma vinculada no campo turmaProfessor
        const turma = {
          id: usuarioBanco.id?.N || Date.now().toString(),
          nome: usuarioBanco.turmaProfessor?.S || "Sem turma",
          professorNome: usuarioBanco.nome?.S || "Desconhecido",
        };

        setTurmas([turma]);
        setTurmaSelecionada(turma);
      }
    } catch (erro) {
      console.error("Erro ao carregar turmas:", erro);
      Alert.alert("Erro", "Não foi possível carregar as turmas.");
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  const handleSelecionarTurma = (turma) => {
    setTurmaSelecionada(turma);
  };

  const carregarAtividades = useCallback(async (turmaId) => {
    if (!turmaId) return;

    setLoading(true);
    try {
      const comando = new ScanCommand({
        TableName: ATIVIDADES_TABLENAME,
        FilterExpression: "turmaId = :id",
        ExpressionAttributeValues: {
          ":id": { N: String(turmaId) },
        },
      });

      const resultado = await dynamoDB.send(comando);

      const atividadesFormatadas = resultado.Items.map((item) => ({
        id: item.id?.N,
        turmaId: item.turmaId?.N,
        descricao: item.descricao?.S || "Sem descrição",
      }))
        .filter((ativ) => ativ.id)
        .sort((a, b) => parseInt(a.id) - parseInt(b.id));

      setAtividades(atividadesFormatadas);
    } catch (erro) {
      console.log("Erro ao carregar atividades:", erro);
      Alert.alert("Erro", "Não foi possível carregar as atividades da turma.");
    } finally {
      setLoading(false);
    }
  }, []);

  const salvarAtividade = async () => {
    if (!descricao || !podeGerenciar) {
      Alert.alert("Atenção", "Preencha a descrição e verifique sua permissão.");
      return;
    }

    if (!turmaSelecionada?.id) {
      Alert.alert("Erro", "Nenhuma turma selecionada para salvar a atividade.");
      return;
    }

    setLoading(true);
    const idParaSalvar = String(modoEdicao || Date.now());

    try {
      const comando = new PutItemCommand({
        TableName: ATIVIDADES_TABLENAME,
        Item: {
          id: { N: idParaSalvar },
          turmaId: { N: String(turmaSelecionada.id) },
          descricao: { S: descricao },
        },
      });

      await dynamoDB.send(comando);
      setModalVisible(false);
      setDescricao("");
      setModoEdicao(null);
      carregarAtividades(turmaSelecionada.id);
      Alert.alert("Sucesso", "Atividade salva com sucesso!");
    } catch (erro) {
      console.log("Erro ao salvar atividade:", erro);
      Alert.alert("Erro", "Não foi possível salvar a atividade.");
    } finally {
      setLoading(false);
    }
  };

  const excluirAtividade = (id) => {
    if (!podeGerenciar || !turmaSelecionada?.id) {
      Alert.alert("Permissão Negada", "Você não tem permissão para excluir.");
      return;
    }

    Alert.alert(
      "Confirmar exclusão",
      `Deseja realmente excluir a atividade ${id}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          onPress: async () => {
            try {
              const comando = new DeleteItemCommand({
                TableName: ATIVIDADES_TABLENAME,
                Key: { id: { N: String(id) } },
              });
              await dynamoDB.send(comando);
              carregarAtividades(turmaSelecionada.id);
              Alert.alert("Sucesso", "Atividade excluída.");
            } catch (erro) {
              console.log("Erro ao excluir atividade:", erro);
              Alert.alert("Erro", "Não foi possível excluir a atividade.");
            }
          },
        },
      ]
    );
  };

  const handleOpenModalToCreate = () => {
    if (!podeGerenciar) return;
    setDescricao("");
    setModoEdicao(null);
    setModalVisible(true);
  };

  const handleOpenModalToEdit = (item) => {
    if (!podeGerenciar) return;
    setDescricao(item.descricao);
    setModoEdicao(item.id);
    setModalVisible(true);
  };

  useEffect(() => {
    carregarDadosEFiltrarTurmas();
  }, [carregarDadosEFiltrarTurmas]);

  useEffect(() => {
    if (turmaSelecionada) {
      carregarAtividades(turmaSelecionada.id);
    }
  }, [turmaSelecionada, carregarAtividades]);

  if (
    loading &&
    (!usuarioLogado || (turmas.length === 0 && !turmaSelecionada))
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0078D7" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  if (!turmaSelecionada && usuarioLogado) {
    return (
      <View style={styles.container}>
        <Text style={styles.mainTitle}>
          {usuarioLogado?.tipo === "admin"
            ? "Selecione uma Turma"
            : `Turma: ${turmaSelecionada?.nome}`}
        </Text>

        {turmaSelecionada && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Professor: {turmaSelecionada.professorNome}
            </Text>
            {usuarioLogado?.tipo === "admin" && (
              <Text style={styles.infoText}>
                Alunos: {turmaSelecionada.alunos || "Nenhum aluno cadastrado"}
              </Text>
            )}
          </View>
        )}
        <FlatList
          data={turmas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelecionarTurma(item)}
            >
              <Ionicons name="school-outline" size={30} color="#0078D7" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardSubtitle}>
                  Professor: {item.professorNome}
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={24} color="#ccc" />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhuma turma encontrada para seu perfil. Verifique seu cadastro.
            </Text>
          }
        />
      </View>
    );
  }

  const renderAtividade = ({ item, index }) => (
    <View style={styles.activityCard}>
      <Text style={styles.activityNumber}>{formatNumero(index)}</Text>
      <View style={styles.activityContent}>
        <Text style={styles.activityCardTitle}>{item.descricao}</Text>
      </View>

      {podeGerenciar && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#F39C12" }]}
            onPress={() => handleOpenModalToEdit(item)}
          >
            <Ionicons name="create-outline" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#E74C3C" }]}
            onPress={() => excluirAtividade(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setTurmaSelecionada(null)}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Turmas</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.headerTitle}>
        {usuarioLogado?.tipo === "aluno"
          ? "Minhas Atividades"
          : "Gerenciar Atividades"}
      </Text>

      <Text style={styles.turmaNome}>Turma: {turmaSelecionada.nome}</Text>
      <Text style={styles.professorNome}>
        Professor: {turmaSelecionada.professorNome}
      </Text>

      {podeGerenciar && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleOpenModalToCreate}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Cadastrar Atividade</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={atividades}
        keyExtractor={(item) => item.id}
        renderItem={renderAtividade}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading
              ? "Carregando..."
              : "Nenhuma atividade registrada nesta turma."}
          </Text>
        }
      />

      {podeGerenciar && (
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {modoEdicao ? "Editar Atividade" : "Nova Atividade"}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Descrição da Atividade"
                placeholderTextColor="#777"
                value={descricao}
                onChangeText={setDescricao}
                editable={!loading}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  disabled={loading}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={salvarAtividade}
                  disabled={loading || !descricao}
                >
                  <Text style={styles.confirmText}>
                    {loading
                      ? "Salvando..."
                      : modoEdicao
                      ? "Salvar Edição"
                      : "Cadastrar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101820FF",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#101820FF",
  },
  loadingText: { color: "#fff", marginTop: 10, fontSize: 16 },
  mainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#0078D7",
    paddingBottom: 10,
  },
  card: {
    backgroundColor: "#1E1E1E",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  cardTitle: { fontSize: 18, color: "#fff", fontWeight: "bold" },
  cardSubtitle: { color: "#ccc", fontSize: 13, marginTop: 4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    backgroundColor: "#333",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  turmaNome: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 8,
  },
  professorNome: {
    fontSize: 14,
    color: "#0078D7",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0078D7",
    paddingBottom: 5,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: "#0078D7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 18,
    marginLeft: 8,
    fontWeight: "bold",
  },
  activityCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 5,
  },
  activityNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0078D7",
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
    marginRight: 10,
  },
  activityCardTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
    padding: 8,
  },
  emptyText: {
    color: "#ccc",
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
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
    minHeight: 100,
    textAlignVertical: "top",
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
