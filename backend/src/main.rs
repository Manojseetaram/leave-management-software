#[tokio::main]
async fn main() {
    let app = api::build_router();
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    println!("listening on 8080");
    axum::serve(listener, app).await.unwrap();
}

