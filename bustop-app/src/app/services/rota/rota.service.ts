import { FirebaseService } from './../firebase/firebase.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { 
  Firestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';

export interface Ponto {
  lat: number;
  lng: number;
}

export interface Rota {
  id?: string; // No Firebase o ID é uma string gerada automaticamente
  nome: string;
  cor: string;
  pontos: Ponto[];
}

@Injectable({
  providedIn: 'root'
})
export class RotaService {
  private db: Firestore;
  private rotasSubject = new BehaviorSubject<Rota[]>([]);
  
  // O mundo externo (componentes) só vê isso:
  rotas$ = this.rotasSubject.asObservable();

  constructor(private firebaseService: FirebaseService) {
    this.db = this.firebaseService.getFirestore();
    this.ouvirRotasEmTempoReal();
  }

  // 1. READ (Ler em tempo real)
  private ouvirRotasEmTempoReal() {
    const rotasCollection = collection(this.db, 'rotas');

    // onSnapshot é o "escutador" do Firebase
    onSnapshot(rotasCollection, (snapshot) => {
      const rotasAtualizadas: Rota[] = snapshot.docs.map(doc => {
        return { id: doc.id, ...doc.data() } as Rota;
      });
      
      // Avisa os componentes que os dados mudaram
      this.rotasSubject.next(rotasAtualizadas);
    }, (error) => {
      console.error("Erro ao buscar rotas:", error);
    });
  }

  // 2. CREATE (Criar nova rota)
  async adicionarRota(rota: Rota) {
    // Remove o ID se existir, pois o Firebase cria um novo
    const { id, ...dadosDaRota } = rota; 
    const rotasCollection = collection(this.db, 'rotas');
    await addDoc(rotasCollection, dadosDaRota);
  }

  // 3. UPDATE (Atualizar pontos ou nome)
  async atualizarRota(rota: Rota) {
    if (!rota.id) return;
    
    const docRef = doc(this.db, 'rotas', rota.id);
    await updateDoc(docRef, {
      nome: rota.nome,
      cor: rota.cor,
      pontos: rota.pontos
    });
  }

  // 4. DELETE (Apagar rota)
  async removerRota(id: string) {
    const docRef = doc(this.db, 'rotas', id);
    await deleteDoc(docRef);
  }
}