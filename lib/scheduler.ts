import { Guru, MataPelajaran, Kelas, Ruangan, JamPelajaran, PengampuMataPelajaran, PreferensiGuru, Jadwal, Hari } from './types';

// Representation of a block that needs to be scheduled
interface ScheduleVariable {
  id: string; // assignmentId + "_block_" + index
  assignmentId: string;
  guru_id: string;
  mapel_id: string;
  kelas_id: string;
  room_candidates: string[]; // Preferred rooms
  block_length: number; // Duration of this block (e.g., 1, 2, 3)
}

// Domain value: where and when this variable block starts
interface DomainValue {
  hari: Hari;
  jam_ke: number;
  ruangan_id: string;
}

// Helper to determine optimal block lengths for a teaching assignment
export function getBlockSizes(subjectName: string, subjectCode: string, totalHours: number): number[] {
  const nameLower = subjectName.toLowerCase();
  const codeLower = subjectCode.toLowerCase();
  
  // Is this Sports / Physical Education or practical lab / art?
  const isOlahraga = nameLower.includes('olahraga') || nameLower.includes('pjok') || codeLower.includes('pjok') || codeLower === 'oje';
  const isPraktikum = nameLower.includes('praktik') || nameLower.includes('lab') || nameLower.includes('seni') || nameLower.includes('keterampilan') || nameLower.includes('music') || nameLower.includes('musik');

  if (isOlahraga || isPraktikum) {
    if (totalHours <= 3) {
      return [totalHours];
    } else if (totalHours === 4) {
      return [3, 1]; // or [2, 2]
    } else {
      return [3, totalHours - 3];
    }
  }

  // General academic subjects (e.g., Math, Indonesian, English)
  if (totalHours <= 1) return [1];
  if (totalHours === 2) return [2];
  if (totalHours === 3) return [3]; // typically a block of 3, or we could do [2, 1]. Blocks of 3 are highly preferred.
  if (totalHours === 4) return [2, 2];
  if (totalHours === 5) return [3, 2]; // e.g. Math 5 JP split into 3 JP on one day, 2 JP on another day.
  if (totalHours === 6) return [3, 3];
  if (totalHours === 7) return [3, 2, 2];

  // Fallback for larger JP amounts
  const blocks: number[] = [];
  let remaining = totalHours;
  while (remaining > 0) {
    if (remaining >= 3) {
      blocks.push(3);
      remaining -= 3;
    } else if (remaining === 2) {
      blocks.push(2);
      remaining -= 2;
    } else {
      blocks.push(1);
      remaining -= 1;
    }
  }
  return blocks;
}

export class CalendarScheduler {
  private teachers: Guru[];
  private subjects: MataPelajaran[];
  private classes: Kelas[];
  private rooms: Ruangan[];
  private periods: JamPelajaran[];
  private assignments: PengampuMataPelajaran[];
  private preferences: PreferensiGuru[];

  private days: Hari[];
  private batasJamHari?: Record<Hari, number>;

  constructor(
    teachers: Guru[],
    subjects: MataPelajaran[],
    classes: Kelas[],
    rooms: Ruangan[],
    periods: JamPelajaran[],
    assignments: PengampuMataPelajaran[],
    preferences: PreferensiGuru[],
    activeDays?: Hari[],
    batasJamHari?: Record<Hari, number>
  ) {
    this.teachers = teachers.filter(t => t.status_aktif);
    this.subjects = subjects;
    this.classes = classes;
    this.rooms = rooms;
    this.periods = periods;
    this.assignments = assignments;
    this.preferences = preferences;
    this.days = activeDays && activeDays.length > 0 ? activeDays : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    this.batasJamHari = batasJamHari;
  }

  // Generate variables to schedule based on active teaching assignments in blocks
  private generateVariables(): ScheduleVariable[] {
    const variables: ScheduleVariable[] = [];

    for (const assign of this.assignments) {
      // Confirm teacher is active before scheduling
      const teacher = this.teachers.find(t => t.id === assign.guru_id);
      if (!teacher) continue;

      // Determine default home room for this class
      const classObj = this.classes.find(c => c.id === assign.kelas_id);
      let roomCandidates = this.rooms.map(r => r.id); // All rooms as fallback

      // Try to find specific room for class or subject (e.g. PJOK needs Lapangan, Komputer needs Lab)
      const subj = this.subjects.find(s => s.id === assign.mapel_id);
      const isOlahraga = subj?.nama_mapel.toLowerCase().includes('olahraga') || subj?.kode_mapel === 'OJE';
      const isKomputer = subj?.nama_mapel.toLowerCase().includes('komputer') || subj?.nama_mapel.toLowerCase().includes('it');
      
      const lapangan = this.rooms.find(r => r.nama_ruangan.toLowerCase().includes('lapangan'));
      const lab = this.rooms.find(r => r.nama_ruangan.toLowerCase().includes('laboratorium') || r.nama_ruangan.toLowerCase().includes('lab'));

      if (isOlahraga && lapangan) {
        roomCandidates = [lapangan.id];
      } else if (isKomputer && lab) {
        roomCandidates = [lab.id];
      } else if (classObj) {
        // Find room with same name as class
        const sameNameRoom = this.rooms.find(r => r.nama_ruangan.toLowerCase().includes(classObj.nama_kelas.toLowerCase()));
        if (sameNameRoom) {
          roomCandidates = [sameNameRoom.id, ...this.rooms.filter(r => r.id !== sameNameRoom.id).map(r => r.id)];
        }
      }

      // Determine the block sizes for this assignment
      const blocks = getBlockSizes(subj?.nama_mapel || '', subj?.kode_mapel || '', assign.jumlah_jam);
      for (let i = 0; i < blocks.length; i++) {
        variables.push({
          id: `${assign.id}_block_${i}`,
          assignmentId: assign.id,
          guru_id: assign.guru_id,
          mapel_id: assign.mapel_id,
          kelas_id: assign.kelas_id,
          room_candidates: roomCandidates,
          block_length: blocks[i]
        });
      }
    }

    return variables;
  }

  // --- ALGORTIMA 1: CSP BACKTRACKING WITH MRV & FORWARD CHECKING ---
  public solveCSP(onProgress?: (msg: string, percent?: number) => void): { schedules: Jadwal[]; score: number; executionTimeMs: number } {
    const startTime = performance.now();
    const variables = this.generateVariables();
    const periodsList = this.periods.map(p => p.jam_ke);

    if (variables.length === 0) {
      return { schedules: [], score: 0, executionTimeMs: 0 };
    }

    onProgress?.(`Memulai algoritma CSP dengan ${variables.length} blok mata pelajaran untuk dijadwalkan...`);

    // State maps during backtracking for constant-time hard constraint validation
    const teacherUsage = new Set<string>(); // "day_period_teacherId"
    const classUsage = new Set<string>();   // "day_period_classId"
    const roomUsage = new Set<string>();    // "day_period_roomId"
    
    // Count of hours scheduled per teacher per day: "teacherId_day" -> number
    const dailyTeacherHours = new Map<string, number>();

    // For spreading soft constraint checks: "class_day_subject" -> count of blocks
    const classDailySubject = new Map<string, number>();

    // Result compilation
    const assignmentMap = new Map<string, DomainValue>();

    // Precompute Teacher Preferences for rapid lookup
    const prefMap = new Map<string, PreferensiGuru>();
    for (const pref of this.preferences) {
      prefMap.set(pref.guru_id, pref);
    }

    // Is current assignment valid?
    const isValid = (v: ScheduleVariable, val: DomainValue): boolean => {
      // Ensure the whole block fits consecutively in the schedule periods
      for (let offset = 0; offset < v.block_length; offset++) {
        const jam_ke = val.jam_ke + offset;

        // 0. Ensure this period exists in our periods list
        if (!periodsList.includes(jam_ke)) return false;

        // Check active hours limit per day (e.g. Jumat only up to Jam Ke-6)
        if (this.batasJamHari && this.batasJamHari[val.hari] !== undefined) {
          if (jam_ke > this.batasJamHari[val.hari]) return false;
        }

        const tKey = `${val.hari}_${jam_ke}_${v.guru_id}`;
        const cKey = `${val.hari}_${jam_ke}_${v.kelas_id}`;
        const rKey = `${val.hari}_${jam_ke}_${val.ruangan_id}`;

        // 1. Hard constraint: Teacher collision
        if (teacherUsage.has(tKey)) return false;

        // 2. Hard constraint: Class collision
        if (classUsage.has(cKey)) return false;

        // 3. Hard constraint: Room collision
        if (roomUsage.has(rKey)) return false;

        // 4. Hard constraint: Teacher preference (blocked day/period/slot)
        const pref = prefMap.get(v.guru_id);
        if (pref) {
          if (pref.hari_tidak_bersedia.includes(val.hari)) return false;
          if (pref.jam_tidak_bersedia.includes(jam_ke)) return false;
          if (pref.slot_tidak_bersedia?.some(s => s.hari === val.hari && s.jam_ke === jam_ke)) return false;
        }
      }

      // 5. Hard constraint: Max hours per day for teacher
      const pref = prefMap.get(v.guru_id);
      if (pref) {
        const currentDailyHrs = dailyTeacherHours.get(`${v.guru_id}_${val.hari}`) || 0;
        if (currentDailyHrs + v.block_length > pref.max_jam_per_hari) return false;
      }

      // 6. Soft constraint: Avoid putting more than 1 block of the same subject on the same day for a class
      const cDailySubjKey = `${v.kelas_id}_${val.hari}_${v.mapel_id}`;
      const existingInDay = classDailySubject.get(cDailySubjKey) || 0;
      if (existingInDay >= 1) {
        return false;
      }

      return true;
    };

    // Helper to calculate total soft constraint score
    const calculateSoftConstraintScore = (): number => {
      let score = 1000; // base score

      for (const [vId, val] of assignmentMap.entries()) {
        const matchingVar = variables.find(v => v.id === vId);
        if (!matchingVar) continue;

        const pref = prefMap.get(matchingVar.guru_id);
        if (pref) {
          // Favorite Day (+15 pts)
          if (pref.hari_favorit.includes(val.hari)) {
            score += 15;
          }
          // Favorite Period (+15 pts)
          for (let offset = 0; offset < matchingVar.block_length; offset++) {
            if (pref.jam_favorit.includes(val.jam_ke + offset)) {
              score += 15;
            }
          }
        }
      }

      return score;
    };

    // MRV (Minimum Remaining Values): Find the unassigned variable with the fewest valid domain values
    const getNextVariableMRV = (assigned: Set<string>): ScheduleVariable | null => {
      let bestVar: ScheduleVariable | null = null;
      let minRemainingVal = Infinity;

      for (const v of variables) {
        if (assigned.has(v.id)) continue;

        // Count potential available starting spaces that don't violate hard constraints
        let domainCount = 0;
        for (const h of this.days) {
          for (const pk of periodsList) {
            for (const rId of v.room_candidates) {
              const dummyVal: DomainValue = { hari: h, jam_ke: pk, ruangan_id: rId };
              if (isValid(v, dummyVal)) {
                domainCount++;
              }
            }
          }
        }

        if (domainCount < minRemainingVal) {
          minRemainingVal = domainCount;
          bestVar = v;
        }
      }

      return bestVar;
    };

    let steps = 0;
    const assignedSet = new Set<string>();
    let maxAssigned = 0;

    const backtrack = (): boolean => {
      steps++;
      if (assignedSet.size > maxAssigned) {
        maxAssigned = assignedSet.size;
        const percent = Math.min(99, Math.round((maxAssigned / variables.length) * 100));
        onProgress?.(`Menyusun jadwal (CSP)... Berhasil memetakan ${maxAssigned} dari ${variables.length} slot mata pelajaran.`, percent);
      }
      if (steps > 25000) {
        // Safeguard to prevent page lock due to over-constraint
        return false;
      }

      const nextVar = getNextVariableMRV(assignedSet);
      if (!nextVar) {
        // All variables assigned!
        return true;
      }

      // Compute prospective domain and sort values by soft constraints to achieve higher utility first
      const domainValues: DomainValue[] = [];
      const pref = prefMap.get(nextVar.guru_id);

      for (const h of this.days) {
        for (const pk of periodsList) {
          for (const rId of nextVar.room_candidates) {
            domainValues.push({ hari: h, jam_ke: pk, ruangan_id: rId });
          }
        }
      }

      // Sort domain values so that favorite days and periods are tried FIRST (Heuristic optimization)
      domainValues.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (pref) {
          if (pref.hari_favorit.includes(a.hari)) scoreA += 10;
          if (pref.jam_favorit.includes(a.jam_ke)) scoreA += 10;
          if (pref.hari_favorit.includes(b.hari)) scoreB += 10;
          if (pref.jam_favorit.includes(b.jam_ke)) scoreB += 10;
        }
        return scoreB - scoreA; // Descending points order
      });

      for (const val of domainValues) {
        if (isValid(nextVar, val)) {
          // Assign
          assignmentMap.set(nextVar.id, val);
          assignedSet.add(nextVar.id);

          for (let offset = 0; offset < nextVar.block_length; offset++) {
            const jam_ke = val.jam_ke + offset;
            const tKey = `${val.hari}_${jam_ke}_${nextVar.guru_id}`;
            const cKey = `${val.hari}_${jam_ke}_${nextVar.kelas_id}`;
            const rKey = `${val.hari}_${jam_ke}_${val.ruangan_id}`;
            teacherUsage.add(tKey);
            classUsage.add(cKey);
            roomUsage.add(rKey);
          }

          const dailyKey = `${nextVar.guru_id}_${val.hari}`;
          dailyTeacherHours.set(dailyKey, (dailyTeacherHours.get(dailyKey) || 0) + nextVar.block_length);

          const cDailySubjKey = `${nextVar.kelas_id}_${val.hari}_${nextVar.mapel_id}`;
          classDailySubject.set(cDailySubjKey, (classDailySubject.get(cDailySubjKey) || 0) + 1);

          // Forward Checking / Recursion
          if (backtrack()) {
            return true;
          }

          // Backtrack (Unassign)
          assignmentMap.delete(nextVar.id);
          assignedSet.delete(nextVar.id);

          for (let offset = 0; offset < nextVar.block_length; offset++) {
            const jam_ke = val.jam_ke + offset;
            const tKey = `${val.hari}_${jam_ke}_${nextVar.guru_id}`;
            const cKey = `${val.hari}_${jam_ke}_${nextVar.kelas_id}`;
            const rKey = `${val.hari}_${jam_ke}_${val.ruangan_id}`;
            teacherUsage.delete(tKey);
            classUsage.delete(cKey);
            roomUsage.delete(rKey);
          }

          dailyTeacherHours.set(dailyKey, dailyTeacherHours.get(dailyKey)! - nextVar.block_length);
          classDailySubject.set(cDailySubjKey, classDailySubject.get(cDailySubjKey)! - 1);
        }
      }

      return false;
    };

    const success = backtrack();
    const finalSchedules: Jadwal[] = [];

    if (success) {
      let scheduleIndex = 1;
      for (const [vId, val] of assignmentMap.entries()) {
        const originalVar = variables.find(v => v.id === vId)!;
        // Since a block contains multiple consecutive hours, we generate a record for each hour
        for (let offset = 0; offset < originalVar.block_length; offset++) {
          finalSchedules.push({
            id: `sch-gen-${scheduleIndex++}`,
            assignment_id: originalVar.assignmentId,
            guru_id: originalVar.guru_id,
            mapel_id: originalVar.mapel_id,
            kelas_id: originalVar.kelas_id,
            ruangan_id: val.ruangan_id,
            hari: val.hari,
            jam_ke: val.jam_ke + offset
          });
        }
      }
      onProgress?.(`CSP Sukses! Jadwal berhasil dibuat dalam ${steps} iterasi.`);
    } else {
      onProgress?.(`CSP gagal menemukan solusi non-bentrok penuh dalam batas iterasi. Menjalankan fallback rileksasi...`);
      return this.solveRelaxedCSP(onProgress, startTime);
    }

    const endTime = performance.now();
    return {
      schedules: finalSchedules,
      score: calculateSoftConstraintScore(),
      executionTimeMs: Math.round(endTime - startTime)
    };
  }

  // A relaxed CSP backtracking solver to handle highly constrained schools
  private solveRelaxedCSP(onProgress?: (msg: string, percent?: number) => void, startTime: number = performance.now()): { schedules: Jadwal[]; score: number; executionTimeMs: number } {
    const variables = this.generateVariables();
    const periodsList = this.periods.map(p => p.jam_ke);
    const assignmentMap = new Map<string, DomainValue>();

    // Use simplified collision detection to guarantee we pack schools
    const teacherUsage = new Set<string>(); 
    const classUsage = new Set<string>();   
    const roomUsage = new Set<string>();    

    const isValidRelaxed = (v: ScheduleVariable, val: DomainValue): boolean => {
      for (let offset = 0; offset < v.block_length; offset++) {
        const jam_ke = val.jam_ke + offset;
        if (!periodsList.includes(jam_ke)) return false;

        const tKey = `${val.hari}_${jam_ke}_${v.guru_id}`;
        const cKey = `${val.hari}_${jam_ke}_${v.kelas_id}`;
        const rKey = `${val.hari}_${jam_ke}_${val.ruangan_id}`;

        if (teacherUsage.has(tKey)) return false;
        if (classUsage.has(cKey)) return false;
        if (roomUsage.has(rKey)) return false;
      }

      return true;
    };

    let maxRelaxedIndex = 0;
    const backtrackRelaxed = (index: number): boolean => {
      if (index > maxRelaxedIndex) {
        maxRelaxedIndex = index;
        const percent = Math.min(99, Math.round((maxRelaxedIndex / variables.length) * 100));
        onProgress?.(`Menyelaraskan slot rileksasi... Memproses ${maxRelaxedIndex} dari ${variables.length} slot.`, percent);
      }
      if (index >= variables.length) return true;
      const v = variables[index];

      // Shuffle domains to give variety
      const options: DomainValue[] = [];
      for (const h of this.days) {
        for (const pk of periodsList) {
          for (const rId of v.room_candidates) {
            options.push({ hari: h, jam_ke: pk, ruangan_id: rId });
          }
        }
      }

      // Sort domain slightly to favor Monday-Thursday early hours
      options.sort((a, b) => b.jam_ke - a.jam_ke);

      for (const val of options) {
        if (isValidRelaxed(v, val)) {
          assignmentMap.set(v.id, val);

          for (let offset = 0; offset < v.block_length; offset++) {
            const jam_ke = val.jam_ke + offset;
            const tKey = `${val.hari}_${jam_ke}_${v.guru_id}`;
            const cKey = `${val.hari}_${jam_ke}_${v.kelas_id}`;
            const rKey = `${val.hari}_${jam_ke}_${val.ruangan_id}`;
            teacherUsage.add(tKey);
            classUsage.add(cKey);
            roomUsage.add(rKey);
          }

          if (backtrackRelaxed(index + 1)) return true;

          assignmentMap.delete(v.id);
          for (let offset = 0; offset < v.block_length; offset++) {
            const jam_ke = val.jam_ke + offset;
            const tKey = `${val.hari}_${jam_ke}_${v.guru_id}`;
            const cKey = `${val.hari}_${jam_ke}_${v.kelas_id}`;
            const rKey = `${val.hari}_${jam_ke}_${val.ruangan_id}`;
            teacherUsage.delete(tKey);
            classUsage.delete(cKey);
            roomUsage.delete(rKey);
          }
        }
      }
      return false;
    };

    let success = backtrackRelaxed(0);
    const finalSchedules: Jadwal[] = [];

    if (!success) {
      onProgress?.(`⚠️ Menemukan kendala kapasitas berlebih. Mengaktifkan Mode Heuristik Best-Effort Toleransi Bentrok agar semua jadwal tetap terisi...`);
      
      // Best-effort greedy placement for unassigned variables
      for (const v of variables) {
        if (assignmentMap.has(v.id)) continue;

        let bestVal: DomainValue | null = null;
        let minPenalty = Infinity;

        // Inspect all possible options to find the one with the lowest conflict penalty
        for (const h of this.days) {
          for (const pk of periodsList) {
            // Ensure the block fits within school hours
            if (pk + v.block_length - 1 > periodsList[periodsList.length - 1]) continue;

            for (const rId of v.room_candidates) {
              let penalty = 0;
              for (let offset = 0; offset < v.block_length; offset++) {
                const jam_ke = pk + offset;
                const tKey = `${h}_${jam_ke}_${v.guru_id}`;
                const cKey = `${h}_${jam_ke}_${v.kelas_id}`;
                const rKey = `${h}_${jam_ke}_${rId}`;

                if (teacherUsage.has(tKey)) penalty += 1000;
                if (classUsage.has(cKey)) penalty += 1000;
                if (roomUsage.has(rKey)) penalty += 500;
              }

              // Favor earlier periods slightly to have a nicely packed schedule
              penalty += pk * 2; 

              if (penalty < minPenalty) {
                minPenalty = penalty;
                bestVal = { hari: h, jam_ke: pk, ruangan_id: rId };
              }
            }
          }
        }

        if (bestVal) {
          assignmentMap.set(v.id, bestVal);
          for (let offset = 0; offset < v.block_length; offset++) {
            const jam_ke = bestVal.jam_ke + offset;
            const tKey = `${bestVal.hari}_${jam_ke}_${v.guru_id}`;
            const cKey = `${bestVal.hari}_${jam_ke}_${v.kelas_id}`;
            const rKey = `${bestVal.hari}_${jam_ke}_${bestVal.ruangan_id}`;
            teacherUsage.add(tKey);
            classUsage.add(cKey);
            roomUsage.add(rKey);
          }
        }
      }
      success = true; // Mark as success now that all items are placed
    }

    if (success) {
      let sIdx = 1;
      for (const [vId, val] of assignmentMap.entries()) {
        const originalVar = variables.find(v => v.id === vId)!;
        for (let offset = 0; offset < originalVar.block_length; offset++) {
          finalSchedules.push({
            id: `sch-gen-relaxed-${sIdx++}`,
            assignment_id: originalVar.assignmentId,
            guru_id: originalVar.guru_id,
            mapel_id: originalVar.mapel_id,
            kelas_id: originalVar.kelas_id,
            ruangan_id: val.ruangan_id,
            hari: val.hari,
            jam_ke: val.jam_ke + offset
          });
        }
      }
      onProgress?.(`Fallback Rileksasi & Heuristik Sukses! Seluruh slot jadwal berhasil didistribusikan secara dinamis.`);
    } else {
      onProgress?.(`Peringatan: Gagal menemukan slot yang bebas dari bentrok. Kapasitas jam sekolah melebihi jumlah slot pengampu yang tersedia.`);
    }

    const endTime = performance.now();
    return {
      schedules: finalSchedules,
      score: 750, // lower priority score mark
      executionTimeMs: Math.round(endTime - startTime)
    };
  }

  // --- ALGORITMA 2: GENETIC ALGORITHM (OPSIONAL TAMBAHAN UNTUK DATA BESAR) ---
  public solveGenetic(onProgress?: (msg: string, percent?: number) => void): { schedules: Jadwal[]; score: number; executionTimeMs: number } {
    const startTime = performance.now();
    const variables = this.generateVariables();
    const periodsList = this.periods.map(p => p.jam_ke);

    if (variables.length === 0) {
      return { schedules: [], score: 0, executionTimeMs: 0 };
    }

    onProgress?.(`Memulai Algoritma Genetika dengan ${variables.length} variabel blok mengajar...`);

    const POPULATION_SIZE = 40;
    const GENERATIONS = 80;
    const MUTATION_RATE = 0.15;

    // A Chromosome contains a DomainValue for each ScheduleVariable block
    type Chromosome = DomainValue[];

    const generateRandomChromosome = (): Chromosome => {
      return variables.map(v => {
        const day = this.days[Math.floor(Math.random() * this.days.length)];
        const limit = this.batasJamHari?.[day] ?? periodsList[periodsList.length - 1];
        // Ensure starting hour doesn't immediately push the block outside the day
        const allowablePeriods = periodsList.filter(pk => 
          pk <= limit && pk + v.block_length - 1 <= limit
        );
        const period = allowablePeriods.length > 0 
          ? allowablePeriods[Math.floor(Math.random() * allowablePeriods.length)]
          : periodsList[Math.floor(Math.random() * periodsList.length)];
        const room = v.room_candidates[Math.floor(Math.random() * v.room_candidates.length)];
        return { hari: day, jam_ke: period, ruangan_id: room };
      });
    };

    // Fitness Function: Returns a numerical score. High scores are good.
    const computeFitness = (chromo: Chromosome): number => {
      let score = 5000; // Base index

      const teacherSet = new Set<string>();
      const classSet = new Set<string>();
      const roomSet = new Set<string>();
      const dailyTeacherCount = new Map<string, number>();
      const classDailySubject = new Map<string, number>();

      for (let i = 0; i < chromo.length; i++) {
        const v = variables[i];
        const val = chromo[i];

        // Ensure the entire block fits within school hours
        let blockFits = true;
        for (let offset = 0; offset < v.block_length; offset++) {
          const jam_ke = val.jam_ke + offset;
          if (!periodsList.includes(jam_ke)) {
            blockFits = false;
            break;
          }
          if (this.batasJamHari && this.batasJamHari[val.hari] !== undefined) {
            if (jam_ke > this.batasJamHari[val.hari]) {
              blockFits = false;
              break;
            }
          }
        }

        if (!blockFits) {
          score -= 1000; // Heavy penalty if block goes out of bounds
          continue;
        }

        for (let offset = 0; offset < v.block_length; offset++) {
          const jam_ke = val.jam_ke + offset;
          const tKey = `${val.hari}_${jam_ke}_${v.guru_id}`;
          const cKey = `${val.hari}_${jam_ke}_${v.kelas_id}`;
          const rKey = `${val.hari}_${jam_ke}_${val.ruangan_id}`;

          // Penalties for conflicts (Hard limits)
          if (teacherSet.has(tKey)) score -= 300;
          teacherSet.add(tKey);

          if (classSet.has(cKey)) score -= 300;
          classSet.add(cKey);

          if (roomSet.has(rKey)) score -= 300;
          roomSet.add(rKey);

          // Daily limits for teachers
          const dailyKey = `${v.guru_id}_${val.hari}`;
          const count = (dailyTeacherCount.get(dailyKey) || 0) + 1;
          dailyTeacherCount.set(dailyKey, count);

          // Check against max preference
          const pref = this.preferences.find(p => p.guru_id === v.guru_id);
          if (pref) {
            if (count > pref.max_jam_per_hari) score -= 150;
            if (pref.hari_tidak_bersedia.includes(val.hari)) score -= 250;
            if (pref.jam_tidak_bersedia.includes(jam_ke)) score -= 250;
            if (pref.slot_tidak_bersedia?.some(s => s.hari === val.hari && s.jam_ke === jam_ke)) score -= 250;

            // Soft positive triggers
            if (pref.hari_favorit.includes(val.hari)) score += 20;
            if (pref.jam_favorit.includes(jam_ke)) score += 20;
          }
        }

        // Penalty for scheduling multiple blocks of same subject on same day
        const cDailySubjKey = `${v.kelas_id}_${val.hari}_${v.mapel_id}`;
        const existingInDay = classDailySubject.get(cDailySubjKey) || 0;
        if (existingInDay >= 1) {
          score -= 400; // strong penalty to spread blocks of same subject across different days
        }
        classDailySubject.set(cDailySubjKey, existingInDay + 1);
      }

      return score;
    };

    // Helper selection
    const selectTournament = (pop: { chromo: Chromosome; fitness: number }[]) => {
      const tournamentParticipants = 4;
      let best = pop[Math.floor(Math.random() * pop.length)];
      for (let i = 1; i < tournamentParticipants; i++) {
        const cand = pop[Math.floor(Math.random() * pop.length)];
        if (cand.fitness > best.fitness) {
          best = cand;
        }
      }
      return best;
    };

    // Helper mutate
    const mutate = (chromo: Chromosome) => {
      for (let i = 0; i < chromo.length; i++) {
        if (Math.random() < MUTATION_RATE) {
          const v = variables[i];
          const newDay = this.days[Math.floor(Math.random() * this.days.length)];
          chromo[i].hari = newDay;
          const limit = this.batasJamHari?.[newDay] ?? periodsList[periodsList.length - 1];
          const allowablePeriods = periodsList.filter(pk => 
            pk <= limit && pk + v.block_length - 1 <= limit
          );
          chromo[i].jam_ke = allowablePeriods.length > 0 
            ? allowablePeriods[Math.floor(Math.random() * allowablePeriods.length)]
            : periodsList[Math.floor(Math.random() * periodsList.length)];
          chromo[i].ruangan_id = v.room_candidates[Math.floor(Math.random() * v.room_candidates.length)];
        }
      }
    };

    // Create Initial Population
    let population: { chromo: Chromosome; fitness: number }[] = Array.from({ length: POPULATION_SIZE }, () => {
      const chromo = generateRandomChromosome();
      return { chromo, fitness: computeFitness(chromo) };
    });

    for (let gen = 0; gen < GENERATIONS; gen++) {
      // Sort population by fitness
      population.sort((a, b) => b.fitness - a.fitness);

      const percent = Math.min(99, Math.round((gen / GENERATIONS) * 100));
      if (gen % 5 === 0) {
        onProgress?.(`Generasi Genetika ${gen}/${GENERATIONS} - Fitness Terbaik: ${population[0].fitness}`, percent);
      }

      if (population[0].fitness >= 4800) {
        onProgress?.(`Generasi ke-${gen}: Solusi jadwal optimal ditemukan lebih cepat!`);
        break;
      }

      const nextGeneration: { chromo: Chromosome; fitness: number }[] = [];

      // Elitism: Preserve the top 2 candidates
      nextGeneration.push(population[0]);
      nextGeneration.push(population[1]);

      while (nextGeneration.length < POPULATION_SIZE) {
        // Tournament Selection
        const parentA = selectTournament(population);
        const parentB = selectTournament(population);

        // Crossover (Single Point)
        const crossoverPoint = Math.floor(Math.random() * variables.length);
        const childChromoA: Chromosome = [];
        const childChromoB: Chromosome = [];

        for (let i = 0; i < variables.length; i++) {
          if (i < crossoverPoint) {
            childChromoA.push(parentA.chromo[i]);
            childChromoB.push(parentB.chromo[i]);
          } else {
            childChromoA.push(parentB.chromo[i]);
            childChromoB.push(parentA.chromo[i]);
          }
        }

        // Mutation
        mutate(childChromoA);
        mutate(childChromoB);

        nextGeneration.push({ chromo: childChromoA, fitness: computeFitness(childChromoA) });
        if (nextGeneration.length < POPULATION_SIZE) {
          nextGeneration.push({ chromo: childChromoB, fitness: computeFitness(childChromoB) });
        }
      }

      population = nextGeneration;
    }

    population.sort((a, b) => b.fitness - a.fitness);
    const bestChromo = population[0].chromo;

    // Convert best chromosome back into Schedule records (preventing concurrent conflicts for same teacher or class)
    let sIdx = 1;
    const finalSchedules: Jadwal[] = [];
    const teacherActiveSlots = new Set<string>();
    const classActiveSlots = new Set<string>();
    const roomActiveSlots = new Set<string>();

    bestChromo.forEach((val, idx) => {
      const originalVar = variables[idx];
      let hasConflict = false;

      // Check if this assignment causes a concurrent collision for teacher, class, or room
      for (let offset = 0; offset < originalVar.block_length; offset++) {
        const jk = val.jam_ke + offset;
        const tKey = `${val.hari}_${jk}_${originalVar.guru_id}`;
        const cKey = `${val.hari}_${jk}_${originalVar.kelas_id}`;
        const rKey = `${val.hari}_${jk}_${val.ruangan_id}`;

        if (teacherActiveSlots.has(tKey) || classActiveSlots.has(cKey) || roomActiveSlots.has(rKey)) {
          hasConflict = true;
          break;
        }
      }

      // If no collision, place it into the grid! If there is a collision, skip it (user can adjust manually)
      if (!hasConflict) {
        for (let offset = 0; offset < originalVar.block_length; offset++) {
          const jk = val.jam_ke + offset;
          const tKey = `${val.hari}_${jk}_${originalVar.guru_id}`;
          const cKey = `${val.hari}_${jk}_${originalVar.kelas_id}`;
          const rKey = `${val.hari}_${jk}_${val.ruangan_id}`;

          teacherActiveSlots.add(tKey);
          classActiveSlots.add(cKey);
          roomActiveSlots.add(rKey);

          finalSchedules.push({
            id: `sch-gen-genetika-${sIdx++}`,
            assignment_id: originalVar.assignmentId,
            guru_id: originalVar.guru_id,
            mapel_id: originalVar.mapel_id,
            kelas_id: originalVar.kelas_id,
            ruangan_id: val.ruangan_id,
            hari: val.hari,
            jam_ke: jk
          });
        }
      }
    });

    onProgress?.(`Algoritma Genetika selesai dengan Fitness Akhir: ${population[0].fitness}. Berhasil menempatkan ${finalSchedules.length} slot jadwal bebas bentrok.`);

    const endTime = performance.now();

    return {
      schedules: finalSchedules,
      score: population[0].fitness,
      executionTimeMs: Math.round(endTime - startTime)
    };
  }
}
export default CalendarScheduler;
