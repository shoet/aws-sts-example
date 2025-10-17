// 可能であれば、PCM でエンコードされた音声を使用します。
// ストリーミングは、できる限りリアルタイムに近いことを確認します。
// レイテンシーは、音声チャンクのサイズによって異なります。音声タイプ (PCM など) でチャンクサイズを指定できる場合は、各チャンクを 50 ミリ秒から 200 ミリ秒の間で設定します。音声チャンクサイズは次の式で計算できます。
// chunk_size_in_bytes = chunk_duration_in_millisecond / 1000 * audio_sample_rate * 2
// チャンクのサイズを統一します。
// 音声チャネル数は正しく指定してください。
// シングルチャネルの PCM 音声では、各サンプルは 2 バイトで構成されるため、各チャンクは偶数のバイトで構成されている必要があります。
// デュアルチャネル の PCM 音声では、各サンプルは 4 バイトで構成されるため、各チャンクは 4 バイトの倍数である必要があります。
// 音声ストリームに音声が含まれていない場合は、同じ量の無音部分をエンコードして送信します。たとえば、PCM の無音は 0 バイトのストリームです。
// 音声には必ず正しいサンプリングレートを指定します。可能であれば、16,000 Hz のサンプリングレートで録音します。これにより、ネットワーク経由で送信される品質とデータ量の最適な妥協点が得られます。ほとんどのハイエンドマイクは 44,100 Hz または 48,000 Hz で録音されます。

class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.listening = false;
    this.channelCount = 1;
    this.chunkdurationInMS = 100; // チャンクの長さ(ms)
    this.sampleRate = 16000; // サンプル/秒
    this.sampleCountPerChunk =
      (this.chunkdurationInMS / 1000) * this.sampleRate; // チャンクあたりのサンプル数
    this.bufferSize = this.sampleCountPerChunk * 2; // 1サンプルあたり、16bit(2byte)で格納するため*2のバッファサイズ
    this.buffer = new ArrayBuffer(this.bufferSize);
    this.currentByteOffset = 0; // バッファ内のオフセット

    this.port.onmessage = (event) => {
      console.log("message received in AudioProcessor:", event.data);
      if (event.data === "START_LISTEN") {
        this.listening = true;
      } else if (event.data === "STOP_LISTEN") {
        this.listening = false;
      }
    };
  }

  /**
   * @param inputs Float32Array[][]
   * @param outputs Float32Array[][]
   * @param parameters Record<string, Float32Array>
   *
   * @returns boolean
   */
  process(inputs, outputs, parameters) {
    /**
     * AmazonTranscribeの推奨形式
     *  `PCM 16 ビット符号付き リトルエンディアンの音声 (WAV は含まない)`
     *
     * Float32をInt16(符号付き16ビット)のデータへ変換が必要
     *    Float32→Int16への変換は、-1.0~1.0のデータを-32768~32767のデータに変換するということ
     * サンプリングレートはここに到達する前に16000で収録されている
     * チャンクは chunk_size_in_bytes = chunk_duration_in_millisecond / 1000 * audio_sample_rate * 2 で構成する
     * シングルチャンネルなので直列にデータを並べていく
     */

    /**
     * inputsは[ノード][チャンネル][サンプルのオフセット]でサンプルの実数が格納されている
     *
     * inputs[x][y][z]と捉えて、
     * xはWorkletNodeに接続したNode(BufferノードやMedisSourceノードのこと)の番号。connect()したやつが順番に入る
     * yはチャンネルのインデックス。今回はシングルチャンネルなので0しか入らない想定
     * zはサンプリングのインデックス。ここでは128サンプルずつ入ると仕様で決められているので、0~127が入る。
     */
    const inputMonoralSamples = inputs[0][0];

    if (this.listening) {
      const view = new DataView(this.buffer);
      for (let i = 0; i < inputMonoralSamples.length; i++) {
        if (this.currentByteOffset >= this.bufferSize) {
          this.port.postMessage({
            message: "AUDIO_DATA",
            audioData: new Uint8Array(this.buffer),
          });
          this.buffer = new ArrayBuffer(this.bufferSize);
          this.currentByteOffset = 0;
        }
        const sample = inputMonoralSamples[i];
        view.setInt16(
          this.currentByteOffset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true, // リトルエンディアン
        );
        this.currentByteOffset += 2;
      }
    }
    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);
