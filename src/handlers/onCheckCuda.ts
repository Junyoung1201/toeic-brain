import { exec } from "child_process";

export async function onCheckCuda() {
    return new Promise((resolve) => {
        exec('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', (error, stdout) => {
            
            if (error) {
                resolve({ available: false, gpuName: null, vram: 0 });
            } else {

                const [name, memory] = stdout.trim().split(',').map(s => s.trim());
                resolve({ available: true, gpuName: name, vram: parseInt(memory, 10) });

            }

        });
    });
}