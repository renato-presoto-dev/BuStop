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

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface Parada extends Coordenada {
  nome?: string;
  horarios?: string[]; 
}

export interface Rota {
  id?: string;
  nome: string;
  cor: string;
  isCiclica: boolean;    
  caminho: Coordenada[]; 
  paradas: Parada[];
  horarios?: string[];     
}

@Injectable({
  providedIn: 'root'
})
export class RotaService {
  private db: Firestore;
  private rotasSubject = new BehaviorSubject<Rota[]>([]);
  
  rotas$ = this.rotasSubject.asObservable();

  constructor(private firebaseService: FirebaseService) {
    this.db = this.firebaseService.getFirestore();
    this.ouvirRotasEmTempoReal();
  }

  // 1. READ (Ler em tempo real)
  private ouvirRotasEmTempoReal() {
    const rotasCollection = collection(this.db, 'rotas');

    onSnapshot(rotasCollection, (snapshot) => {
      const rotasAtualizadas: Rota[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          nome: data['nome'],
          cor: data['cor'],
          isCiclica: data['isCiclica'] || false, // Garante que não venha nulo
          caminho: data['caminho'] || [],        // Garante que seja um array
          paradas: data['paradas'] || []         // Garante que seja um array
        } as Rota;
      });
      
      this.rotasSubject.next(rotasAtualizadas);
    }, (error) => {
      console.error("Erro ao buscar rotas:", error);
    });
  }

  // 2. CREATE (Criar nova rota)
  async adicionarRota(rota: Rota) {
    const { id, ...dadosDaRota } = rota; 
    const rotasCollection = collection(this.db, 'rotas');
    await addDoc(rotasCollection, dadosDaRota);
  }

  // 3. UPDATE (Atualizar rotas no banco)
  async atualizarRota(rota: Rota) {
    if (!rota.id) return;
    
    const docRef = doc(this.db, 'rotas', rota.id);
    
    // AQUI ESTAVA O ERRO: Agora enviamos as propriedades corretas
    await updateDoc(docRef, {
      nome: rota.nome,
      cor: rota.cor,
      isCiclica: rota.isCiclica,
      caminho: rota.caminho,
      paradas: rota.paradas
    });
  }

  // 4. DELETE (Apagar rota)
  async removerRota(id: string) {
    const docRef = doc(this.db, 'rotas', id);
    await deleteDoc(docRef);
  }
}