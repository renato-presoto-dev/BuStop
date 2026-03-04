import { FirebaseService } from './../firebase/firebase.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { 
  Firestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot 
} from 'firebase/firestore';

export interface Coordenada {
  lat: number;
  lng: number;
}

// 1. ROTA AGORA SÓ TEM O TRAJETO
export interface Rota {
  id?: string;
  nome: string;
  cor: string;
  isCiclica: boolean;    
  caminho: Coordenada[]; 
}

// 2. NOVA INTERFACE: Liga o horário a uma rota específica
export interface HorarioPassagem {
  hora: string;
  rotaId: string; // ID da rota que passa neste horário
}

// 3. PARADA AGORA É INDEPENDENTE
export interface Parada extends Coordenada {
  id?: string;
  nome: string;
  horarios: HorarioPassagem[]; // Lista de horários com suas respectivas rotas
}

@Injectable({
  providedIn: 'root'
})
export class RotaService {
  private db: Firestore;
  
  // Agora temos dois canais de dados separados
  private rotasSubject = new BehaviorSubject<Rota[]>([]);
  private paradasSubject = new BehaviorSubject<Parada[]>([]);
  
  rotas$ = this.rotasSubject.asObservable();
  paradas$ = this.paradasSubject.asObservable();

  constructor(private firebaseService: FirebaseService) {
    this.db = this.firebaseService.getFirestore();
    this.ouvirRotasEmTempoReal();
    this.ouvirParadasEmTempoReal();
  }

  // ==========================================
  // LÓGICA DAS ROTAS (Trajetos)
  // ==========================================
  private ouvirRotasEmTempoReal() {
    onSnapshot(collection(this.db, 'rotas'), (snapshot) => {
      const rotasAtualizadas: Rota[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          nome: data['nome'],
          cor: data['cor'],
          isCiclica: data['isCiclica'] || false,
          caminho: data['caminho'] || []
        } as Rota;
      });
      this.rotasSubject.next(rotasAtualizadas);
    });
  }

  async adicionarRota(rota: Rota) {
    const { id, ...dados } = rota; 
    await addDoc(collection(this.db, 'rotas'), dados);
  }

  async atualizarRota(rota: Rota) {
    if (!rota.id) return;
    await updateDoc(doc(this.db, 'rotas', rota.id), {
      nome: rota.nome, cor: rota.cor, isCiclica: rota.isCiclica, caminho: rota.caminho
    });
  }

  async removerRota(id: string) {
    await deleteDoc(doc(this.db, 'rotas', id));
  }

  // ==========================================
  // LÓGICA DAS PARADAS (Pontos de Ônibus)
  // ==========================================
  private ouvirParadasEmTempoReal() {
    onSnapshot(collection(this.db, 'paradas'), (snapshot) => {
      const paradasAtualizadas: Parada[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data['nome'] || 'Ponto sem nome',
          lat: data['lat'],
          lng: data['lng'],
          horarios: data['horarios'] || [] // Array de { hora, rotaId }
        } as Parada;
      });
      this.paradasSubject.next(paradasAtualizadas);
    });
  }

  async adicionarParada(parada: Parada) {
    const { id, ...dados } = parada;
    await addDoc(collection(this.db, 'paradas'), dados);
  }

  async atualizarParada(parada: Parada) {
    if (!parada.id) return;
    await updateDoc(doc(this.db, 'paradas', parada.id), {
      nome: parada.nome,
      lat: parada.lat,
      lng: parada.lng,
      horarios: parada.horarios
    });
  }

  async removerParada(id: string) {
    await deleteDoc(doc(this.db, 'paradas', id));
  }
}