// Fila de prioridade (heap binário de mínimo) usada pelas buscas de Custo Uniforme, Gulosa e A*

class MinHeap {
  constructor() {
    this.items = [];
    this.counter = 0;
  }

  get size() {
    return this.items.length;
  }

  // Empate na prioridade é decidido por `tie` (menor primeiro) e depois pela ordem de inserção (FIFO).
  push(value, priority, tie = 0) {
    this.items.push({ value: value, priority: priority, tie: tie, order: this.counter++ });
    this.siftUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    let top = this.items[0];
    let last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this.siftDown(0);
    }
    return top.value;
  }

  values() {
    return this.items.map(item => item.value);
  }

  less(a, b) {
    if (a.priority !== b.priority) return a.priority < b.priority;
    if (a.tie !== b.tie) return a.tie < b.tie;
    return a.order < b.order;
  }

  siftUp(i) {
    while (i > 0) {
      let parent = (i - 1) >> 1;
      if (!this.less(this.items[i], this.items[parent])) break;
      [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
      i = parent;
    }
  }

  siftDown(i) {
    let n = this.items.length;
    while (true) {
      let left = 2 * i + 1;
      let right = left + 1;
      let smallest = i;
      if (left < n && this.less(this.items[left], this.items[smallest])) smallest = left;
      if (right < n && this.less(this.items[right], this.items[smallest])) smallest = right;
      if (smallest === i) break;
      [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
      i = smallest;
    }
  }
}
