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
  // Adiciona ScrollView no Modal para melhor usabilidade
  ScrollView, 
} from "react-native";
// Ícones do Ionicons já estavam, mantidos
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

// Paleta de Cores para Consistência
const COLORS = {
    background: "#11274d",         // Azul Escuro (Fundo principal)
    cardBackground: "#fff",        // Branco (Fundo dos cards e modal)
    inputBackground: "#f0f0f0",     // Cinza Claro (Fundo dos inputs)
    primary: "#63b8ff",            // Azul Vibrante (Botão principal/Salvar)
    accent: "#F2BE5B",             // Amarelo/Laranja (Destaque/Edição)
    danger: "#E74C3C",             // Vermelho (Exclusão)
    textDark: "#11274d",           // Texto Escuro
    textLight: "#333",             // Texto Secundário
};


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
  }, []); 

  // --- Funções de Permissão e Dados (Funcionalidade) ---
  const verificarPermissaoEcarregarUsuarios = async () => {
    const usuarioLogadoString = await AsyncStorage.getItem("usuarioLogado");
    if (usuarioLogadoString) {
      const user = JSON.parse(usuarioLogadoString);
      setUsuarioLogado(user); 
      if (user.tipo !== "admin") {
        Alert.alert(
          "Acesso Negado",
          "Apenas administradores podem gerenciar usuários."
        );
        navigation.goBack();
        return;
      } 
      carregarUsuarios();
    } else {
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
        senha: "******", // Senha hashada não deve ser exibida
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

    const id = modoEdicao || Date.now().toString(); // Mantém o ID original na edição
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
      // Garante que os campos não existam ou sejam vazios para não-professores
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
  }; 

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

  // --- Renderização dos Itens da Lista (Visual Aprimorado) ---
  const renderUsuario = ({ item }) => (
    <View style={styles.card}>
      
      {/* Botões de Ação */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleOpenModalToEdit(item)}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.textDark} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => excluirUsuario(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.cardBackground} />
        </TouchableOpacity>
      </View>

      <Text style={styles.cardTitle}>{item.nome}</Text>
      <Text style={styles.cardDetail}>Email: {item.email}</Text>
      <Text style={styles.cardDetail}>Tipo: <Text style={styles.cardType}>{item.tipo.toUpperCase()}</Text></Text>
      {item.tipo === "professor" && (
        <>
          <Text style={styles.cardDetail}>Turma: {item.turmaProfessor}</Text>
          <Text style={styles.cardDetail}>Curso: {item.cursoProfessor}</Text>
        </>
      )}
      <Text style={styles.cardID}>ID: {item.id}</Text>
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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.cardBackground, marginTop: 10 }}>
          Verificando permissões...
        </Text>
      </View>
    );
  }

  // --- Layout Principal ---
  return (
    <View style={styles.container}>
      
      {/* Botão de Criação Flutuante/Fixo */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleOpenModalToCreate}
      >
        <Ionicons name="add-circle" size={24} color={COLORS.textDark} />
        <Text style={styles.addButtonText}>Criar Usuário</Text>
      </TouchableOpacity>

      {/* Lista de Usuários */}
      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id}
        renderItem={renderUsuario}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
          ) : (
            <Text style={styles.emptyText}>Nenhum usuário cadastrado.</Text>
          )
        }
      />

      {/* Modal de criação/edição (Com ScrollView para acomodar todos os campos) */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modoEdicao
                ? "Editar Usuário (ID: " + modoEdicao + ")"
                : "Novo Usuário"}
            </Text>
            
            <ScrollView style={{ maxHeight: '80%' }}>
                
                {/* Inputs de Formulário */}
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
                    dropdownIconColor={COLORS.primary}
                    enabled={!loading}
                  >
                    <Picker.Item label="Aluno" value="aluno" />
                    <Picker.Item label="Professor" value="professor" />
                    <Picker.Item label="Admin" value="admin" />
                  </Picker>
                </View>

                {/* Campos para Professor */}
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
            </ScrollView>

            {/* Botões do Modal */}
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
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.confirmText}>
                        {modoEdicao ? "Salvar Edição" : "Criar"}
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

// --- Novos Estilos com a Paleta Consistente ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background, // Fundo principal azul escuro
        padding: 16,
    },
    emptyText: {
        color: "#ccc",
        textAlign: "center",
        marginTop: 50,
        fontSize: 16,
    },
    
    // Botão Adicionar Usuário (Fixo no topo)
    addButton: {
        backgroundColor: COLORS.primary, // Azul vibrante
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        // Adiciona sombra
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    addButtonText: {
        color: COLORS.textDark, // Texto escuro para contraste no botão azul claro
        fontSize: 18,
        marginLeft: 8,
        fontWeight: "bold",
    },
    
    // Card de Usuário
    card: {
        backgroundColor: COLORS.cardBackground, // Fundo branco
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        position: "relative",
    },
    actionButtonsContainer: {
        position: "absolute",
        top: 10,
        right: 10,
        flexDirection: 'row',
        zIndex: 10,
    },
    deleteButton: {
        backgroundColor: COLORS.danger, // Vermelho de Exclusão
        borderRadius: 8,
        padding: 6,
        marginLeft: 8,
    },
    editButton: {
        backgroundColor: COLORS.accent, // Amarelo/Laranja de Edição
        borderRadius: 8,
        padding: 6,
    },
    cardTitle: {
        fontSize: 20,
        color: COLORS.textDark,
        fontWeight: "bold",
        marginBottom: 4,
    },
    cardDetail: {
        color: COLORS.textLight,
        fontSize: 14,
    },
    cardType: {
        fontWeight: 'bold',
        color: COLORS.primary, // Destaca o tipo com a cor primária
    },
    cardID: {
        marginTop: 8,
        fontSize: 12,
        color: '#aaa',
    },
    
    // Estilos do Modal (Manter a aparência limpa)
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: COLORS.cardBackground,
        width: "90%",
        maxWidth: 450,
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: COLORS.textDark,
        marginBottom: 16,
        textAlign: "center",
    },
    input: {
        backgroundColor: COLORS.inputBackground, // Cinza claro
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        color: COLORS.textDark,
    },
    pickerContainer: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: 10,
        marginBottom: 10,
        overflow: "hidden",
    },
    picker: {
        height: 50,
        width: "100%",
        color: COLORS.textDark,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    cancelButton: {
        backgroundColor: "#ccc",
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: COLORS.primary, // Azul vibrante
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    cancelText: {
        color: COLORS.textDark,
        fontWeight: "bold",
    },
    confirmText: {
        color: "#fff",
        fontWeight: "bold",
    },
});